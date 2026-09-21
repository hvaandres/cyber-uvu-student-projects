# Findings & Remediations Register — Birthday Memory (Track B)

Each row is a remediation with paired before/after evidence. CVSS v3.1 scores
describe the **pre-remediation** severity (what the board is being asked to fund
fixing). Status `Remediated` means the after-evidence and a regression test both
pass. Evidence files are under `security/evidence/`.

| ID | Title | Component | CVSS v3.1 (base) | Vector | Status | Evidence |
|----|-------|-----------|------------------|--------|--------|----------|
| F-01 | Missing authentication — anonymous full CRUD over PII | API | **9.1 Critical** | `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N` | Remediated | before/B-01..B-04, after/F-01 |
| F-02 | DB application role is a superuser (excess privilege) | DB | **8.8 High** | `AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H` | Remediated | before/D2, after/D2_C |
| F-03 | Hardcoded DB credentials committed to a public repo | DB/Repo | **7.5 High** | `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` | Remediated | before/secrets_git_history |
| F-04 | DB port published on all interfaces (0.0.0.0) | Container | **6.5 Medium** | `AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` | Remediated | before/container_posture, after/D2_C |
| F-05 | Container runs as root with all capabilities, no limits | Container | **6.0 Medium** | `AV:L/AC:H/PR:L/UI:N/S:C/C:H/I:H/A:H` | Remediated | before/container_posture, after/D2_C |
| F-06 | No rate limiting + unbounded queries/body (DoS + scrape) | API | **5.3 Medium** | `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:L` | Remediated | before/B-06..B-10, after/F-02,F-03 |
| F-07 | Wildcard CORS + missing security headers + verbose errors | API | **4.3 Medium** | `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` | Remediated | before/B-06..B-10, after/F-03 |
| F-08 | Plaintext PII at rest; DB transport not enforced (TLS off) | DB | **4.9 Medium** | `AV:N/AC:H/PR:H/UI:N/S:U/C:H/I:N/A:N` | Partially remediated (see residual risk) | before/D2 |
| N-01 | SQL injection — **tested, NOT vulnerable** (the trap) | API | N/A (negative) | — | Verified secure | before/B-05, test #13 |

---

## Per-finding detail

### F-01 — Missing authentication (Critical)
- **Before:** `GET/POST/PUT/DELETE /api/birthdays` all succeeded with no
  credentials (B-01..B-04): full read, insert, overwrite, and delete of every
  PII record by any anonymous caller.
- **CVSS rationale:** `AV:N` (HTTP), `AC:L` (single request), `PR:N` (no auth),
  `UI:N`, `S:U`, `C:H`+`I:H` (full read and write of PII), `A:N` (availability
  not the primary loss here — scored separately in F-06).
- **Fix:** Bearer-token middleware (`server/src/auth.js`) on all data routes;
  constant-time digest compare; server refuses to boot without a ≥16-char
  `API_TOKEN` (fail-closed). Health probe intentionally left open.
- **After:** anonymous and bad-token requests → `401`; valid token → `200`
  (after/F-01). Regression tests #1–5.
- **Trade-off:** a browser-visible SPA token gates anonymous access but is not
  per-user; per-user auth is roadmap item 7.

### F-02 — DB role is superuser (High)
- **Before:** app connected as role `birthday` with `rolsuper=t`; could
  `CREATE`/`DROP` any object (D2). An app-level bug would escalate to full DB
  control.
- **Fix:** init script creates `bm_app` (`NOSUPERUSER NOCREATEDB NOCREATEROLE`)
  with only `SELECT/INSERT/UPDATE/DELETE` on `birthdays`. App connects as it.
- **After:** `rolsuper=f`; DDL denied ("permission denied for schema public");
  CRUD still works (after/D2_C).

### F-03 — Committed credentials (High)
- **Before:** `docker-compose.yml` committed `POSTGRES_PASSWORD: birthday`;
  `.env.example` shipped working defaults (secrets_git_history).
- **Fix:** compose reads all secrets from gitignored `.env`; `.env.example`
  ships only `CHANGE_ME` placeholders with generation commands. No real secret
  committed. (History note in residual risk.)

### F-04 / F-05 — Container exposure & privilege (Medium)
- **Before:** `0.0.0.0:5544` published to the LAN; container root, no cap_drop,
  no limits, no `no-new-privileges`.
- **Fix:** port bound `127.0.0.1:5544`; `cap_drop: ALL` + minimal add;
  `no-new-privileges:true`; mem 512m / cpus 1.0 / pids 200; image pinned by
  digest.
- **After:** LAN IP refuses connection, loopback works; inspect shows caps/limits
  applied (after/D2_C).

### F-06 / F-07 — DoS, scraping, headers, CORS (Medium)
- **Before:** no rate limit (20/20 → 200); `/upcoming` read the whole table into
  Node; wildcard CORS; no security headers; malformed JSON → 500; `X-Powered-By`
  present.
- **Fix:** `express-rate-limit` (100/15 min); list pagination capped at 100;
  `/upcoming` row-scan capped; `express.json({limit:'16kb'})`; helmet CSP; CORS
  allowlist; malformed JSON → 400, oversized → 413; `x-powered-by` disabled;
  generic 500s; health no longer leaks driver error.
- **After:** 429s appear after 100 reqs; evil origin gets no ACAO; 400/413 as
  expected (after/F-02, F-03). Regression tests #6–12.

### F-08 — Plaintext PII / transport (Medium, partially remediated)
- **Done in code:** least-priv role, strong password, `PGSSL=true` verifies the
  cert (`rejectUnauthorized:true`), loopback-only DB.
- **Deferred (residual risk):** field/at-rest encryption of phone/email and
  TLS between API and DB. Compensating controls: DB not internet-reachable,
  least-priv role, secrets off-repo. See SECURITY.md.

### N-01 — SQL injection: tested, NOT vulnerable (the deliberate trap)
- All queries use bound parameters (`$1..$n`). The tautology `' OR '1'='1`
  returns `[]` because the input is a bound `ILIKE` literal, and a lone `'`
  causes no 500 / SQL syntax error (B-05). Reported as **verified secure**, not
  as a finding. Regression test #13 locks this behavior.
