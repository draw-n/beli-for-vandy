# Security scan and remediation results

## Latest local verification after integrating `origin/main` — 2026-11-11

This verification was run on the merged working tree combining PR branch
commit `86fd611` with `origin/main` at `913b93d`, before creating the merge
commit. It is local evidence; hosted CI has not been claimed for this merge.

| Check | Result |
| --- | --- |
| Backend pytest and coverage | 171 passed, 1 local MongoDB test skipped; 76.31% coverage with `--cov-fail-under=70`. |
| Ruff | Passed. |
| Semgrep 1.182.0 | Passed; 0 findings, 225 rules, 72 targets, 20 excluded. |
| pip-audit 2.10.1 | Production and development requirements both report no known vulnerabilities. |
| npm audit 11.7.0 | High-threshold command passed; 28 affected package records, all Moderate, grouped to GHSA-3g3m-2fjr-6pw4 (`glob`) and GHSA-g3hv-75wg-m249 (`minimatch`); 0 Low/High/Critical. |
| Gitleaks 8.30.1 | Redacted full-history scan passed; 155 commits scanned, no leaks. |

The frontend `npm ci`, unit, coverage, lint, typecheck, build, and Playwright
results for the dependency update were run before merging `origin/main` and are
recorded in the following branch snapshot. PR #84's hosted 76.21% run remains
the latest recorded hosted verification of the 70% backend gate.

## Dependency-update local verification — 2026-11-11 (pre-merge snapshot)

This local verification was run on branch `sara/dependency-security-updates`,
based on `origin/main` commit `d3e0d486f83dbbf7e3ea053b8e9aaadf4d2619c0`.
This scan and test snapshot was recorded on commit `86fd611`, before the branch
merged newer `origin/main`. It verifies the dependency updates; the later
main-branch gate and hosted results are recorded below. No hosted result is
claimed for this pre-merge snapshot.

| Scanner | Result | Gate behavior |
| --- | --- | --- |
| Semgrep 1.182.0 (`p/python`, `p/typescript`) | Completed; 0 findings, 225 rules, 72 targets scanned, 20 excluded. | Pass; High/Critical or malformed/scanner-error results fail closed. |
| pip-audit 2.10.1, production requirements | Completed; no known vulnerabilities. | Pass; any reported advisory fails. |
| pip-audit 2.10.1, development requirements | Completed; no known vulnerabilities. | Pass; any reported advisory fails. |
| npm audit 11.7.0 | Completed; 28 affected package entries, all Moderate; 0 High, 0 Critical, 0 Low. Entries group to two unique advisories: GHSA-3g3m-2fjr-6pw4 (`glob`) and GHSA-g3hv-75wg-m249 (`minimatch`). | `npm audit --audit-level=high` passed; the existing threshold is unchanged. |
| Gitleaks 8.30.1 | Completed redacted full-history scan across 154 commits; no leaks found. | Pass; full-history scanning and the narrow documented fixture fingerprint remain enabled. |

The targeted lockfile updates resolve seven unique advisory IDs: four for
`fast-uri` (GHSA-w74x-v6f9-j3xg, GHSA-wjr9-j795-jxcr,
GHSA-333x-w4r6-6crp, GHSA-xhq7-xmqj-769h), one for `ip-address`
(GHSA-rxp7-6hxx-x8q5), and two for Vitest (`GHSA-qxg6-89mg-rqv8`,
`GHSA-xp26-3454-mjgp`). The remaining Moderate npm advisories are documented
with fix paths and deferral reasons in `findings.md`. These are dependency
scanner advisories, not confirmed exploitable application vulnerabilities.

Regression checks also completed locally: `npm ci`; 159 Angular unit tests;
frontend coverage (68.33% statements, 61.36% branches, 61.84% functions,
74.34% lines); ESLint; TypeScript typecheck; production build; and one Playwright
cross-stack integration test. The build passed with existing bundle-size budget
warnings. Backend pytest passed 163 tests with one local MongoDB integration
test skipped and 69.87% total coverage (the pre-merge tree's gate was 65%); Ruff passed.
Both production and development pip-audit checks reported no vulnerabilities.
Workflow YAML parsing and `git diff --check` passed. These are local results,
not a claim that hosted CI passed on this branch commit.

## Main-branch scan baseline and PR #84 hosted gate

- Main scan snapshot: commit `d3e0d486f83dbbf7e3ea053b8e9aaadf4d2619c0` (`2026-11-11`), before PR #84's coverage update.
- Hosted workflow: [CI run 43106394877](https://github.com/draw-n/beli-for-vandy/actions/runs/43106394877); security gate, quality gate, and staging deployment completed successfully.
- Semgrep 1.182.0: 225 rules on 72 files, 0 findings.
- pip-audit 2.10.1: no known vulnerabilities in `backend/requirements-dev.txt`; direct Pillow pin remains 13.0.0.
- npm audit 11.7.0: passed the High/Critical gate. The pre-update lockfile scan reported 33 affected package names across 9 unique advisories (7 Moderate, 2 Low; 0 High/Critical), grouped in `findings.md`.
- Gitleaks 8.30.1: full-history scan completed with no unignored leaks. The single previously reviewed fingerprint remains narrowly listed in `.gitleaksignore`; no matched value is included in reports.
- Semgrep test fixtures are excluded intentionally because the production-source SAST scope does not include tests. Gitleaks still scans test files and full history. Bandit is not configured, and no Bandit report was available in the repository to classify the reported fixture alerts by rule.

Current ruleset `main` requires both `Quality gate` and `Security gate`, along
with one approving review. These are the ruleset API's exact job check
contexts; GitHub may visually group them under the `CI` workflow.

Coverage from that earlier hosted run was backend **69.77% combined** before
the new moderation tests; frontend **68.33% statements, 61.36% branches,
61.84% functions, and 74.34% lines**. The isolated local run after adding the
moderation tests is recorded below. PR #84 later raised the backend threshold
to 70%; the hosted result below verifies the gate after moderation tests were
added.

## Sprint 4 pipeline update local verification

On 2026-11-11, the complete backend suite was rerun in the dedicated
`sara/sprint4-pipeline-update` worktree based on `d3e0d48`, using Python 3.12.15
and the repository coverage configuration. Command:
`python -m pytest --cov=backend --cov-config=.coveragerc --cov-report=term-missing --cov-fail-under=70`.
Result: **171 passed, 1 skipped, 76.31% combined branch-aware coverage**; the
skipped test requires a real MongoDB service. No shared Atlas connection was
made. Ruff passed on the full backend tree. The hosted results follow.

The PR #84 hosted run [43123530295](https://github.com/draw-n/beli-for-vandy/actions/runs/43123530295)
completed successfully: Security gate and Quality gate passed, and the
semantic-title check passed. In CI, all **172 backend tests passed** with the
disposable MongoDB service and measured **76.21% combined branch-aware
coverage**, exceeding `--cov-fail-under=70`. The Security gate completed
Semgrep, pip-audit, npm audit, and full-history Gitleaks successfully. Staging
deployment was skipped as expected for a pull request. This hosted result
confirms the 70% gate on the PR #84 commit. Hosted coverage was 76.21%; the
isolated local run measured 76.31%.

## PR #73 post-update results (2026-11-07)

The PR #73 results document the original dependency remediation commit; the
main and later branch snapshots above document subsequent verification.

## Scope and tooling

- Historical remediation base: `origin/main` at `eedec371c63f81f49be3c06a54897f7d9670dd59`.
- Remediation branch base: `sara/security-scan` at `0374d6501afd4d5ef42d7967cfd95d9620fb5ef0`.
- Historical remediation scan date: 2026-11-07. Current main re-verification is
  recorded above.
- Remediation commit: `ad53d2e6ae9a146f1faa57ae2ebb45035785a117`.
- Semgrep 1.182.0; `p/python` and `p/typescript`; backend application code and `frontend/src`.
- pip-audit 2.10.1; `backend/requirements-dev.txt` (includes `backend/requirements.txt`).
- npm audit 11.7.0; `frontend/package-lock.json`; gate threshold remains `--audit-level=high`.
- Gitleaks 8.30.1; complete available history, `--log-opts=--all`, 100% redaction.

## Post-update scan results from PR #73 (2026-11-07)

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
- Historical backend suite: 147 passed, 1 skipped, 20 subtests passed. The
  local real MongoDB integration test skipped; no Atlas connection was made.
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

After adding `backend/tests/test_moderation.py`, the full local backend suite
passed 171 tests with one real-MongoDB test skipped and measured 76.31% combined
coverage using `--cov-fail-under=70`. Ruff passed on the new test file. No Atlas
connection was made.

## Workflow behavior and hosted status

The active `main` ruleset requires the exact job check contexts **`Security
gate`** and **`Quality gate`** for workflow `CI`, plus one approving review.
The ruleset API does not include the workflow name in each stored context. No
repository settings were changed during this work.

In PR #72's run before remediation, Semgrep passed, pip-audit failed on
Pillow, and npm audit and Gitleaks were skipped by GitHub Actions after the
earlier step failure. The workflow now uses `if: !cancelled()` for scanner
steps, which allows later scanners to run while preserving job failure. The
hosted [PR #73 run](https://github.com/draw-n/beli-for-vandy/actions/runs/42392785450)
completed successfully with all four scanners; the latest main run is linked
above. The remaining Moderate npm advisories do not fail the High/Critical gate.

## Preliminary triage

- Pillow 13.0.0 resolved 39 records in the remediation audit (upstream classifications: 3 Critical,
  12 High, 21 Medium, 3 Low). These are dependency advisories, not 39 confirmed
  exploitable Beli vulnerabilities. Per-ID applicability is in `findings.md`.
- The targeted npm update clears all 9 unique High IDs. Nine unique
  Moderate/Low advisories remain; their identifiers, dependency paths, available
  fixes, and reasons for deferral are in `findings.md`.
- No application code or behavior was changed. No manual OWASP review or full
  security audit is claimed.
