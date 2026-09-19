import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { pool } from './db.js';
import birthdaysRouter from './routes.js';
import { makeAuth } from './auth.js';

/**
 * Builds the Express app. Kept separate from the listener (index.js) so the
 * security regression tests can import a fully-wired app without opening a port.
 *
 * @param {object} opts
 * @param {string} opts.apiToken       Expected bearer token (required).
 * @param {string[]} opts.corsOrigins  Exact allowlist of browser origins.
 * @param {object} [opts.logger]       pino logger; falsy disables request logs.
 */
export function createApp({ apiToken, corsOrigins, logger }) {
  const app = express();

  // Do not advertise the framework/version (fingerprinting aid).
  app.disable('x-powered-by');

  // Behind a single localhost hop in this deployment; trust one proxy so
  // express-rate-limit keys on the real client IP without being spoofable.
  app.set('trust proxy', 1);

  if (logger) {
    app.use(pinoHttp({
      logger,
      // Never log Authorization headers or request bodies (PII / secrets).
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
      },
    }));
  }

  // Security headers. This is a JSON API, so a strict CSP that forbids any
  // active content is appropriate and cheap.
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { 'default-src': ["'none'"], 'frame-ancestors': ["'none'"] },
    },
    hsts: false, // enabled at the TLS-terminating proxy in production, not here.
  }));

  // Strict CORS allowlist instead of the previous wildcard. Requests with no
  // Origin (curl, server-to-server) are allowed; browser origins must match.
  const allowlist = new Set(corsOrigins);
  app.use(cors({
    origin(origin, cb) {
      if (!origin || allowlist.has(origin)) return cb(null, true);
      return cb(null, false); // reflected as a missing ACAO header -> browser blocks.
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }));

  // Bound request bodies. A birthday record is tiny; 16kb is generous.
  app.use(express.json({ limit: '16kb' }));

  // Liveness probe stays open so orchestrators can check it without a token.
  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      // Do not leak the driver error message to unauthenticated callers.
      res.status(503).json({ status: 'degraded' });
    }
  });

  // Throttle the authenticated data API: 100 requests / 15 min / IP.
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, slow down.' },
  });

  app.use('/api/birthdays', apiLimiter, makeAuth(apiToken), birthdaysRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

  // eslint-disable-next-line no-unused-vars -- Express detects error mw by arity.
  app.use((error, req, res, _next) => {
    // Malformed JSON from body-parser: client error, not a 500.
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Malformed JSON body.' });
    }
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body too large.' });
    }
    if (req.log) req.log.error({ err: error }, 'unhandled error');
    else console.error('[api]', error);
    // Generic message only — never surface stack traces or driver internals.
    res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  return app;
}
