# Security Review: Birthday Memory

This is a defensive review of the local application code and Docker Compose configuration. Test
only systems and data that you own or are authorized to assess. Findings should be confirmed in
the intended deployment environment before being treated as production vulnerabilities.

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | `server/src/routes.js` | 18-148 | Birthday CRUD routes do not enforce authentication or authorization. A caller who can reach the API may list, create, update, or delete records. | 9/10 |
| 2 | 🟡 MEDIUM | `server/src/index.js` | 10 | `cors()` allows cross-origin requests from arbitrary origins. This is risky if the API later uses browser credentials or is exposed beyond local development. | 9/10 |
| 3 | 🟡 MEDIUM | `docker-compose.yml` | 3, 6-11 | PostgreSQL uses predictable development credentials and publishes the database port to the host. This is unsafe if the development configuration is exposed to an untrusted network. | 9/10 |
| 4 | 🟡 MEDIUM | `server/src/db.js` | 17 | Enabling `PGSSL=true` disables certificate verification with `rejectUnauthorized: false`, allowing an encrypted but unverified database connection. | 9/10 |
| 5 | ⚪ LOW | `server/src/index.js` | 13-19 | The health endpoint returns the raw database error message to the client. Depending on the driver and deployment, this may disclose internal connection details. | 8/10 |

## Recommended remediation

1. Add authentication middleware and enforce record ownership for every birthday route.
2. Replace unrestricted CORS with an explicit allowlist of trusted frontend origins.
3. Move database credentials to deployment secrets, use a strong password, and avoid publishing
   PostgreSQL to interfaces or networks that do not need access.
4. Configure PostgreSQL TLS with a trusted CA or certificate verification rather than setting
   `rejectUnauthorized: false`.
5. Return a generic health-check error to clients while logging detailed diagnostics server-side.

## Validation plan

- In Postman, test every CRUD endpoint without an Authorization header and record the current
  behavior. After authentication is added, repeat the tests and expect unauthorized requests to
  fail.
- Send a request with an untrusted `Origin` header and verify that production CORS policy does not
  allow it.
- Inspect `docker compose ps`, `docker port thebirthdates-db`, and deployment firewall rules.
- Test a managed PostgreSQL connection with certificate verification enabled.
- Stop PostgreSQL and call `/api/health`; confirm the client receives a generic response without
  secrets or infrastructure details.

The complete beginner testing and learning guide is in [`solution.html`](solution.html).
