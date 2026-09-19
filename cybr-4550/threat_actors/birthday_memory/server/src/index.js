import 'dotenv/config';
import pino from 'pino';
import { createApp } from './app.js';
import { assertSchema, pool } from './db.js';

const PORT = Number(process.env.PORT ?? 4000);
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

/** Reads required config, failing closed if a security-critical value is absent. */
function loadConfig() {
  const apiToken = process.env.API_TOKEN;
  if (!apiToken || apiToken.length < 16) {
    logger.error(
      'API_TOKEN is missing or too short (min 16 chars). Refusing to start ' +
      'an unauthenticated API. Generate one with: openssl rand -hex 32',
    );
    process.exit(1);
  }

  const corsOrigins = String(process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return { apiToken, corsOrigins };
}

async function start() {
  const { apiToken, corsOrigins } = loadConfig();

  try {
    await assertSchema();
    logger.info('[db] schema verified on "thebirthdates"');
  } catch (error) {
    logger.error(
      { err: error.message },
      '[db] schema check failed. Is Postgres running and initialised? Try: npm run db:up',
    );
    process.exit(1);
  }

  const app = createApp({ apiToken, corsOrigins, logger });
  app.listen(PORT, '127.0.0.1', () => {
    logger.info(`[api] listening on http://127.0.0.1:${PORT}`);
    if (corsOrigins.length === 0) {
      logger.warn('[cors] no CORS_ORIGINS set: browser requests will be blocked.');
    }
  });
}

start();

// Best-effort clean shutdown so the pool does not leak connections.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    pool.end().finally(() => process.exit(0));
  });
}
