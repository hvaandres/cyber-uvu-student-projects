// Security regression tests. Each test encodes a security PROPERTY so a future
// change that silently re-opens a hole fails CI instead of shipping.
//
// Run: npm test  (requires the DB container: `npm run db:up` + seed once)
import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db.js';

const TOKEN = process.env.API_TOKEN;
const app = createApp({
  apiToken: TOKEN,
  corsOrigins: ['http://localhost:5173'],
  logger: null,
});

test.after(async () => { await pool.end(); });

test('AuthN: anonymous read is rejected with 401', async () => {
  const res = await request(app).get('/api/birthdays');
  assert.equal(res.status, 401);
});

test('AuthN: anonymous create is rejected with 401', async () => {
  const res = await request(app)
    .post('/api/birthdays')
    .send({ firstName: 'A', lastName: 'B', birthdate: '1990-01-01' });
  assert.equal(res.status, 401);
});

test('AuthN: anonymous delete is rejected with 401', async () => {
  const res = await request(app)
    .delete('/api/birthdays/00000000-0000-0000-0000-000000000000');
  assert.equal(res.status, 401);
});

test('AuthN: wrong bearer token is rejected with 401', async () => {
  const res = await request(app)
    .get('/api/birthdays')
    .set('Authorization', 'Bearer not-the-real-token');
  assert.equal(res.status, 401);
});

test('AuthN: valid token is accepted (app still works)', async () => {
  const res = await request(app)
    .get('/api/birthdays?limit=1')
    .set('Authorization', `Bearer ${TOKEN}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('Headers: X-Powered-By is not disclosed', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('Headers: security headers from helmet are present', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.ok(res.headers['content-security-policy']);
});

test('CORS: an unlisted origin is not reflected', async () => {
  const res = await request(app)
    .get('/api/birthdays')
    .set('Origin', 'https://evil.example.com')
    .set('Authorization', `Bearer ${TOKEN}`);
  assert.notEqual(res.headers['access-control-allow-origin'], 'https://evil.example.com');
  assert.notEqual(res.headers['access-control-allow-origin'], '*');
});

test('CORS: the allowlisted origin is reflected', async () => {
  const res = await request(app)
    .get('/api/birthdays')
    .set('Origin', 'http://localhost:5173')
    .set('Authorization', `Bearer ${TOKEN}`);
  assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
});

test('Input: malformed JSON returns 400, not 500', async () => {
  const res = await request(app)
    .post('/api/birthdays')
    .set('Authorization', `Bearer ${TOKEN}`)
    .set('Content-Type', 'application/json')
    .send('{bad json');
  assert.equal(res.status, 400);
});

test('DoS: oversized body is rejected with 413', async () => {
  const big = 'x'.repeat(40000);
  const res = await request(app)
    .post('/api/birthdays')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send({ firstName: big, lastName: 'y', birthdate: '1990-01-01' });
  assert.equal(res.status, 413);
});

test('DoS: list page size is capped at 100 even if a larger limit is asked', async () => {
  const res = await request(app)
    .get('/api/birthdays?limit=99999')
    .set('Authorization', `Bearer ${TOKEN}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.length <= 100);
});

test('Injection: SQL metacharacters in q are treated as a literal (no error, no dump)', async () => {
  const res = await request(app)
    .get(`/api/birthdays?q=${encodeURIComponent("' OR '1'='1")}`)
    .set('Authorization', `Bearer ${TOKEN}`);
  assert.equal(res.status, 200);
  // Bound as a literal ILIKE pattern -> matches nothing, does not return all rows.
  assert.equal(res.body.length, 0);
});
