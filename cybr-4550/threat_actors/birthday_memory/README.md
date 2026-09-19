# 🕯️ Birthday Memory — Application Security Hardening (CYBR 4550)

> **Portfolio note (read me first).** This repository began as an intentionally
> vulnerable app: a birthday tracker (React + Express + PostgreSQL) storing real
> PII — full name, date of birth, phone, email — with **no authentication of any
> kind**. As the AppSec engineer on "Operation Candlelight," I threat-modeled the
> system, remediated all three tiers (API, database, container) in code, and
> proved each fix with paired before/after evidence and automated regression
> tests. This README is the three-minute version. Full write-up:
> [`security/board-report/`](security/board-report/) · posture:
> [`SECURITY.md`](SECURITY.md) · threat model:
> [`security/threat-model/threat-model.md`](security/threat-model/threat-model.md).

## What was wrong, and what I did about it

| # | Finding | Severity | Fix (in code) | Proof |
|---|---------|----------|---------------|-------|
| F-01 | Anonymous full CRUD over all PII (no auth) | **Critical** | Fail-closed bearer-token auth on every data route | 401 for anon, 200 for valid; tests #1–5 |
| F-02 | DB app role was a **superuser** | **High** | Least-privilege `bm_app` role (DML-only, no DDL) | DDL denied, CRUD works |
| F-03 | DB password `birthday` committed to repo | **High** | All secrets moved to gitignored `.env`; strong generated values | no secret in tree |
| F-04/05 | DB port on `0.0.0.0`; container root, all caps, no limits | **Medium** | Loopback bind, `cap_drop: ALL`, `no-new-privileges`, mem/cpu/pids limits | LAN refused, inspect deltas |
| F-06/07 | No rate limit, unbounded queries/body, wildcard CORS, no headers, 500s | **Medium** | rate-limit, pagination caps, 16 kB body, helmet CSP, CORS allowlist, 400/413 | 429s, headers, tests #6–12 |
| F-08 | Plaintext PII, TLS off | **Medium** | Least-priv + TLS-verify option; encryption on roadmap | residual risk documented |
| N-01 | **SQL injection — tested, NOT vulnerable** | — | Left parameterized; locked with a regression test | `' OR '1'='1` → `[]`; test #13 |

> The last row is the assignment's deliberate trap. The queries were already
> parameterized, so I reported SQLi as **verified secure**, not as a finding.

**Result:** 13/13 security regression tests pass; `npm audit` clean on server and
client; all before/after evidence in [`security/evidence/`](security/evidence/).

## Tech stack

React 18 + Vite · Node.js + Express 4 · PostgreSQL 16 (Docker) · npm.
Security libraries added: `helmet`, `express-rate-limit`, `pino`; tests via
Node's built-in test runner + `supertest`.

## Run it (hardened)

Prerequisites: Node 18+ and Docker.

```bash
# 1. Install dependencies
npm run install:all

# 2. Create secrets (all .env files are gitignored)
cp .env.example .env                # DB passwords + app-role password
cp server/.env.example server/.env  # API_TOKEN, DB connection, CORS
cp client/.env.example client/.env  # VITE_API_TOKEN (must equal API_TOKEN)
# Generate strong values:
#   openssl rand -base64 24   (passwords)   openssl rand -hex 32   (API_TOKEN)
# Set APP_DB_PASSWORD (.env) == PGPASSWORD (server/.env),
# and API_TOKEN (server/.env) == VITE_API_TOKEN (client/.env).

# 3. Start the database (creates schema + least-privilege role on first run)
npm run db:up

# 4. Seed synthetic data (fake names only) and run the app
npm --prefix server run seed
npm run dev            # API on 127.0.0.1:4000, client on :5173
```

The API will **refuse to start** without a valid `API_TOKEN` and DB password —
this is intentional (fail-closed). Requests without a bearer token get `401`.

## Run the security tests

```bash
npm run db:up && npm --prefix server run seed   # once
npm --prefix server test                        # 13 security regression tests
```

## Repository layout (security work)

```
security/
├── board-report/                 # Board report (source + PDF)
├── threat-model/threat-model.md  # DFD, STRIDE, asset inventory, roadmap
├── findings-and-remediations.md  # register w/ CVSS vectors + before/after
├── findings.csv                  # structured findings register
└── evidence/
    ├── before/                   # pre-remediation transcripts
    ├── after/                    # post-remediation transcripts (paired)
    └── scans/                    # Trivy, npm audit, git-history secret scan
SECURITY.md                       # resulting posture + disclosure process
```

## Scope & ethics

All testing was performed against my own fork on my own machine, bound to
`localhost`, seeded with synthetic data only. No real personal data, no exposure
to the internet, no third-party or classmate systems — per the assignment rules
of engagement.
