# Security Posture — Birthday Memory

This document describes the security posture after the Track B hardening work
and the process for reporting vulnerabilities. It is written to accompany the
board report in `security/board-report/`.

## ASVS target

This application targets **OWASP ASVS 3.0 Level 1** (opportunistic), with
selected Level 2 controls (authentication, access control, error handling).
Level 1 is the justified target because Birthday Memory is a pre-launch internal
tool; Level 2 across the board (notably per-user authorization and full audit
logging) is scheduled before any customer-facing rollout — see the roadmap in
`security/threat-model/threat-model.md`.

## Controls in place

**Application (API)**
- Bearer-token authentication on all `/api/birthdays` routes; constant-time
  compare; server refuses to start without a ≥16-char `API_TOKEN` (fail-closed).
- Strict CORS allowlist (`CORS_ORIGINS`); no wildcard.
- `helmet` security headers with a deny-all CSP for this JSON API.
- `express-rate-limit`: 100 requests / 15 min / IP.
- Request body capped at 16 kB; malformed JSON → 400; oversized → 413.
- List endpoint paginated (max 100 rows); `/upcoming` row-scan bounded.
- Parameterized SQL throughout (SQL injection verified absent).
- Generic error responses; no stack traces or driver internals leaked.
- `X-Powered-By` disabled; structured request logging with secrets redacted.
- API listener bound to `127.0.0.1`.

**Data (PostgreSQL)**
- Application connects as least-privilege role `bm_app`
  (`NOSUPERUSER NOCREATEDB NOCREATEROLE`, DML-only on one table).
- Strong, generated credentials supplied via gitignored `.env`; none committed.
- `statement_timeout` and a bounded connection pool.
- TLS option verifies the server certificate (`rejectUnauthorized: true`).

**Container**
- DB port bound to `127.0.0.1` only.
- `cap_drop: ALL` with a minimal add-back; `no-new-privileges:true`.
- Memory (512m), CPU (1.0), and PID (200) limits.
- Image pinned by digest for supply-chain integrity.

## Residual risk (accepted, with compensating controls)

1. **Browser-visible API token.** A SPA token gates anonymous access but is not
   a per-user credential. *Compensating:* internal use only; rotate `API_TOKEN`
   on exposure. *Roadmap:* per-user auth (argon2 + sessions/JWT).
2. **PII stored in plaintext.** *Compensating:* least-priv role, DB not
   internet-reachable, secrets off-repo. *Roadmap:* field/at-rest encryption +
   key management.
3. **API↔DB traffic not yet TLS.** *Compensating:* loopback-only, single host.
   *Roadmap:* enable TLS when the DB moves off-box.
4. **Base image OS CVEs.** `postgres:16-alpine` carries 22 HIGH/CRITICAL CVEs in
   bundled binaries (Trivy). These are upstream and unpatched at the pinned
   digest. *Compensating:* not internet-exposed, least-priv, non-root process.
   *Roadmap:* re-scan and bump the digest on each patch cycle (below).
5. **Container rootfs is writable.** *Roadmap:* read-only rootfs + tmpfs mounts.
6. **Historical commit of the `birthday` password.** The weak default exists in
   pre-fork git history. *Action:* that credential is dev-only and never used in
   any real environment; production uses generated secrets. Treat the historical
   value as burned — never reuse it.

## Patch cadence

- `npm audit` (server + client) on every PR; block on High/Critical.
- Re-run Trivy against the image monthly and before any release; bump the pinned
  digest deliberately after review.
- Run the security regression suite (`npm --prefix server test`) in CI.

## Reporting a vulnerability

This is a course project. To report an issue, open a **private** security
advisory on the GitHub fork (Security → Advisories → "Report a vulnerability")
or email the maintainer listed on the repository. Please do not open a public
issue with exploit details. Include: affected endpoint/component, reproduction
steps, and impact. Expected acknowledgement: 5 business days.
