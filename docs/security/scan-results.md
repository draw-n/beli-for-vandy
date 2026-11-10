# Security scan and remediation results

## Scope and tooling

- Repository base: `origin/main` at `eedec371c63f81f49be3c06a54897f7d9670dd59`.
- Remediation branch base: `sara/security-scan` at `0374d6501afd4d5ef42d7967cfd95d9620fb5ef0`.
- Scan date: 2026-11-07. Local scans and hosted PR #73 workflow completed on
  2026-11-07.
- Remediation commit: `ad53d2e6ae9a146f1faa57ae2ebb45035785a117`.
- Semgrep 1.182.0; `p/python` and `p/typescript`; backend application code and `frontend/src`.
- pip-audit 2.10.1; `backend/requirements-dev.txt` (includes `backend/requirements.txt`).
- npm audit 11.7.0; `frontend/package-lock.json`; gate threshold remains `--audit-level=high`.
- Gitleaks 8.30.1; complete available history, `--log-opts=--all`, 100% redaction.

## Post-update scan results

| Scanner | Result | Gate behavior |
| --- | --- | --- |
| Semgrep | Completed; 0 findings, 225 rules, 63 source files scanned, 17 excluded. | Pass; High/Critical and malformed/scanner-error results fail. |
| pip-audit | Completed; no known vulnerabilities after Pillow 13.0.0. | Pass; any advisory returns nonzero. |
| npm audit | Completed; 36 affected-package entries, 0 High, 0 Critical, 36 Moderate. These correspond to 9 unique Moderate/Low advisory IDs documented in `findings.md`. | `npm audit --audit-level=high` passes; no threshold was lowered. |
| Gitleaks | Completed across 134 commits; no unignored leaks after recording the single reviewed fixture fingerprint. | Pass; full-history scan remains active and any other match fails. |

The Gitleaks fingerprint is the historical mock-cookie test fixture at
`backend/tests/test_account_api.py:260`, commit
`9058127463ee11d7285d2ce91c8e16413a31a894`. Its value is intentionally absent
from this document and all reports. See `findings.md` for the redacted evidence
and narrow exception rationale.

## Regression verification

- Pillow photo tests: 44 passed (`backend/tests/test_photo_storage.py` and
  `backend/tests/test_photos.py`).
- Backend suite: 147 passed, 1 skipped, 20 subtests passed. The local real
  MongoDB integration test skipped; no Atlas connection was made.
- Ruff: passed.
- Frontend ESLint and TypeScript typecheck: passed.
- Angular unit tests: 134 passed across 17 test files.
- Playwright integration: 1 passed against isolated local test services.
- Production Angular build: passed locally under Node 22.12 and in the hosted
  PR workflow. A separate attempt under the environment's default Node 26.12
  exited early without a diagnostic; the supported Node 22.12 run prerendered
  4 routes.
- Workflow YAML and staging dependency checks: passed. Semgrep synthetic gate
  checks returned High=1, Medium=0, scanner error=2, malformed JSON=2.
- `git diff --check`: passed for the remediation implementation; documentation
  metadata is being recorded in a follow-up commit.

## Workflow behavior and hosted status

The exact expected status context is **`CI / Security gate`** (workflow `CI`,
job `Security gate`). The active `main` ruleset currently has an empty
`required_status_checks` list; an administrator must add this context. No
repository settings were changed.

In PR #72's latest run before remediation, Semgrep passed, pip-audit failed on
Pillow, and npm audit and Gitleaks were skipped by GitHub Actions after the
earlier step failure. The workflow now uses `if: !cancelled()` for scanner
steps, which allows later scanners to run while preserving job failure. The
hosted [PR #73 run](https://github.com/draw-n/beli-for-vandy/actions/runs/42392785450)
completed successfully: Semgrep, pip-audit, npm audit, and full-history
Gitleaks all executed and passed; quality gate passed and staging deployment
was skipped for this pull request. The remaining Moderate npm advisories do
not fail the High/Critical gate.

## Preliminary triage

- Pillow 13.0.0 resolves 39 records (upstream classifications: 3 Critical,
  12 High, 21 Medium, 3 Low). These are dependency advisories, not 39 confirmed
  exploitable Beli vulnerabilities. Per-ID applicability is in `findings.md`.
- The targeted npm update clears all 9 unique High IDs. Nine unique
  Moderate/Low advisories remain; their identifiers, dependency paths, available
  fixes, and reasons for deferral are in `findings.md`.
- No application code or behavior was changed. No manual OWASP review or full
  security audit is claimed.
