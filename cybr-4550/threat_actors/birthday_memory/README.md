# Operation Candlelight: Security Assessment & Penetration Test Report (Track A)

## Executive Summary
This repository contains a comprehensive penetration test and security architecture evaluation of **Birthday Memory**, a multi-tier web application (React, Node.js/Express, PostgreSQL, Docker) designed to store and manage employee Personally Identifiable Information (PII). 

The assessment was conducted under the **OWASP Web Security Testing Guide (WSTG v4.2)** methodology. Testing revealed critical systemic vulnerabilities across the application, database, and container layers. Most notably, the application lacks an authentication and authorization layer, exposing all CRUD operations to unauthenticated network actors.

---

## Technical Stack & Assessment Scope
* **Target Application:** Birthday Memory (`thebirthdates`)
* **Architecture:** React Single Page Application (Vite), Express.js REST API, PostgreSQL 16 (Dockerized)
* **Scope Domains:**
  * **Domain 1 (API):** Express routing, middleware, CORS, error handling, session/token management.
  * **Domain 2 (Database):** PostgreSQL transport security, role privileges, query parameterization, data-at-rest encryption.
  * **Domain 3 (Container):** Docker daemon configuration, host port binding, secret injection, runtime user boundaries.

---

## Summary of Findings Register

| Finding ID | Title | OWASP Category | Severity | CVSS v3.1 Score | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Unauthenticated CRUD API Exposing Bulk PII | A01 / A07 | **Critical** | 9.3 | Confirmed Vulnerable |
| **SEC-02** | Wildcard CORS Permitting Cross-Origin Exfiltration | A05 | **Medium** | 6.5 | Confirmed Vulnerable |
| **SEC-03** | Absence of Defensive HTTP Headers (Missing Helmet) | A05 | **Low** | 3.7 | Confirmed Vulnerable |
| **SEC-04** | Complete Absence of Audit Logging on Mutating Routes | A09 | **High** | 7.5 | Confirmed Vulnerable |
| **SEC-05** | Database Port Published to All Host Interfaces (`0.0.0.0:5544`) | Container | **High** | 7.5 | Confirmed Vulnerable |
| **SEC-06** | Hardcoded Plaintext Database Credentials | A02 | **High** | 7.5 | Confirmed Vulnerable |
| **SEC-07** | Unbounded Data Retrieval (Denial of Service Surface) | Availability | **Medium** | 5.3 | Confirmed Vulnerable |
| **SEC-08** | Codebase Resistance to SQL Injection (Parameterized Queries) | A03 | **None** | 0.0 | **Tested — Not Vulnerable** |
| **SEC-09** | Lack of Data Encryption at Rest for Sensitive PII | A04 | **High** | 7.5 | Confirmed Vulnerable |
| **SEC-10** | Mutable Container Image Tags (`postgres:16-alpine`) | A08 | **Low** | 3.1 | Confirmed Vulnerable |
| **SEC-11** | Server-Side Request Forgery Surface Evaluation | A10 | **None** | 0.0 | **Not Applicable (Justified)** |

---

## Defensive Engineering & Verification Standard
All identified vulnerabilities are documented with deterministic reproduction steps, unedited raw HTTP/terminal transcripts, and CVSS v3.1 vector calculations with single-sentence metric justifications. Negative findings (such as SQL Injection resistance via parameterized queries) have been explicitly verified through AST/source review and active fuzzing to prevent false positives.

* Full penetration test report: `Operation_Candlelight_RedTeam_Report.pdf`
* Structured findings matrix: `findings.md`
* Raw evidence and reproduction transcripts: `security/evidence/`
