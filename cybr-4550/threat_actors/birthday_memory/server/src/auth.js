import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Bearer-token authentication for an internal machine API.
 *
 * Birthday Memory has no user accounts, so a full login system would invent a
 * feature that does not exist. The realistic control for a service-to-service /
 * internal API is a shared secret presented as `Authorization: Bearer <token>`.
 *
 * Design notes:
 * - The expected token comes from API_TOKEN (env). The server refuses to start
 *   without it (see index.js) so we never fall back to an implicit "open" mode.
 * - Comparison is constant-time over SHA-256 digests to avoid leaking the token
 *   length or a byte-by-byte match position through timing.
 * - GET /api/health is intentionally left unauthenticated (liveness probe).
 */

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function makeAuth(expectedToken) {
  if (!expectedToken || typeof expectedToken !== 'string') {
    throw new Error('makeAuth requires a non-empty expected token');
  }
  const expectedDigest = sha256(expectedToken);

  return function requireAuth(req, res, next) {
    const header = req.get('authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());

    if (!match) {
      res.set('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const presentedDigest = sha256(match[1]);
    // Digests are always 32 bytes, so timingSafeEqual never throws on length.
    const ok = timingSafeEqual(presentedDigest, expectedDigest);

    if (!ok) {
      res.set('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    return next();
  };
}
