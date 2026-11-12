# Security scanning and coverage

## CI security stage

The `Security gate` job in the `CI` workflow runs in parallel with `Quality gate` for every
pull request targeting `main` and every push to `main`. It runs Semgrep against
backend and Angular application source, `pip-audit` against the pinned Python
requirements, `npm audit --audit-level=high` against the frontend lockfile, and
Gitleaks across all fetched Git history. Scanner steps use `if: !cancelled()` so
one scanner finding does not skip later scanners; their nonzero exits still fail
the job. Staging depends on both jobs and remains limited to pushes to `main`.

The SAST scanner uses Semgrep CLI 1.182.0 and the maintained `p/python` and
`p/typescript` rulesets. It scans application source and excludes test files,
test directories, generated output, dependency directories, coverage, and
Playwright artifacts. Bandit is not configured; adding it would duplicate the
existing Python SAST stage. No Bandit report was present in this repository, so
the teammate-reported test-fixture alerts could not be classified rule by rule.
Pytest assertions and synthetic test fixtures are expected in test code; test
directories are excluded from this production-source SAST scan, while Gitleaks
continues scanning full history.

Its gate maps CVSS-like `security-severity` scores of
9.0+ to Critical, 7.0–8.9 to High, 4.0–6.9 to Medium, and below 4.0 to Low;
when a rule has no numeric security score, Semgrep ERROR/WARNING/INFO maps to
High/Medium/Info. High or Critical results fail the gate. Medium, Low, and Info
results remain visible in CI output. A scanner error, malformed report, or
unrecognized severity fails closed. Scanner severity is a triage signal and
does not establish exploitability under the course definitions.

For Appendix C, assign the course category from impact evidence: Critical
requires an internet-accessible account takeover, unrestricted data access or
modification, or a confirmed exposed live secret; High requires authenticated
access to another user’s data or bypass of an important business rule. A
Semgrep score at or above 7.0 blocks CI for review, but does not by itself make
the threat a course High finding. Dependency scanner High/Critical labels also
need reachability and impact review. Lower scanner categories are triage hints;
the course definitions determine the team’s final classification.

`pip-audit` 2.10.1 audits the pinned backend requirements and exits nonzero on
any reported vulnerable dependency; it does not expose a reliable severity
threshold. `npm audit` uses npm 11.7.0 and fails at High or Critical. Gitleaks
8.30.1 scans full history with full redaction. Its only ignored fingerprint is a
reviewed synthetic mock-cookie fixture, recorded in `.gitleaksignore`; this
does not exclude the file, rule, or commit from scanning, and other findings
still fail. Scanner logs and artifacts must never contain matched secret values.

The dependency update verification run on 2026-11-11 found no Python advisories
in either production or development requirements. npm audit reported 28
affected package entries, all Moderate, with no High/Critical results. Those
entries group to two unique advisories: GHSA-3g3m-2fjr-6pw4 (`glob`) and
GHSA-g3hv-75wg-m249 (`minimatch`). Both remain in frontend build/lint tooling;
their published fixes require broader toolchain changes (Angular CLI 22 or an
ESLint major downgrade), so they are recorded for follow-up rather than forced
into this targeted patch. The fixed fast-uri, ip-address, and Vitest advisories
are listed in `findings.md`.

No scanner uses `continue-on-error` or ignored exit codes. Scanner installation
and execution failures fail the job. The PR job has `contents: read` permission
and no deployment secrets.

### Require the security status check

GitHub Actions failures block merges because the active `main` ruleset currently
requires both workflow job check contexts: **`Quality gate`** and
**`Security gate`** (workflow name `CI`). Read-only inspection of ruleset
`main` confirmed both required contexts, one approving review, and strict
status checks. The UI may visually group these under the `CI` workflow; the
ruleset API stores the check-run contexts as the job names above. No repository
settings were changed.

## Reproduce scans

Run from the repository root. These commands scan application source and the
tracked dependency inputs; Gitleaks scans every locally available ref and commit.

```bash
python3 -m pip install semgrep==1.182.0 pip-audit==2.10.1
semgrep scan --config p/python --config p/typescript --metrics=off \
  --exclude '*.spec.ts' --exclude '**/tests/**' \
  --exclude '**/node_modules/**' --exclude '**/.venv/**' \
  --exclude '**/dist/**' --exclude '**/coverage/**' \
  --exclude '**/playwright-report/**' \
  --json backend/main.py backend/settings.py backend/database.py \
  backend/controllers backend/models backend/routes frontend/src \
  > /tmp/beli-semgrep-results.json
python3 scripts/security/check_semgrep_results.py /tmp/beli-semgrep-results.json
pip-audit --requirement backend/requirements-dev.txt --format=columns
(cd frontend && npm exec --yes --package=npm@11.7.0 -- npm audit --audit-level=high)
docker run --rm -v "$PWD:/path" -w /path \
  ghcr.io/gitleaks/gitleaks@sha256:b109bc5f8f76a38196a3e413704fc5b9e3c32360bce4e4b603bd6f45b3721dbb \
  git --redact=100 --log-opts=--all .
```

The scanner versions are pinned. Semgrep rulesets are maintained upstream and
downloaded at scan time; results can change when those rulesets are updated.
Do not publish unredacted Gitleaks output. If Gitleaks reports a possible live
credential, record its type and location only and notify the credential owner
for separate investigation and rotation.

## Coverage status and path to 70%

The latest successful hosted run on `main` (`d3e0d48`, 2026-11-11) used the
CI coverage commands. Before the focused tests in `backend/tests/test_moderation.py`,
the backend measured 69.77% combined branch-aware coverage (164 passed, including
the disposable MongoDB test). A local rerun without a MongoDB service measured
69.87% (163 passed, one integration test skipped). The new moderation API tests
exercise role authorization, report creation/queue/duplicate handling,
resolution/audit history, review hiding, and admin suspension/unsuspension. The
full local backend suite then measured 76.31% (171 passed, one MongoDB-dependent
test skipped). Recent hosted PR #84 runs passed the backend 70% gate with
172 passing tests using CI's disposable MongoDB service; coverage ranged from
76.21% to 76.31%. The latest run, 43123530295, measured 76.21%.

The latest hosted frontend coverage on the same main commit was 68.33%
statements, 61.36% branches, 61.84% functions, and 74.34% lines. A clean local
`npm ci` and coverage run on Node 26 measured 67.22%, 60.84%, 61.34%, and 73.34%
respectively; the hosted Node 22 result is the CI baseline because Node 22 is the
version configured in the workflow.

| Suite / metric | Current measured | Gate | Gap to 70% | Meaningful next test targets |
| --- | ---: | ---: | ---: | --- |
| Backend combined, after new tests | 76.31% local; 76.21% latest hosted PR #84 (76.21–76.31% across runs) | 70% | 0 pp (6.21 pp above latest hosted) | Keep adding authorization and failure-path tests with behavior changes. |
| Frontend statements | 68.33% hosted | 50% | 1.67 pp | `frontend/src/app/api/moderation.api.ts`; moderation dashboard actions and load/error states. |
| Frontend branches | 61.36% hosted | 50% | 8.64 pp | Moderator/admin paths, failed moderation actions, empty/loaded/error states. |
| Frontend functions | 61.84% hosted | 50% | 8.16 pp | `frontend/src/app/moderation/moderation.ts` and `frontend/src/app/rankings/rankings.ts` have little direct spec coverage. |
| Frontend lines | 74.34% hosted | 70% | 0 pp (4.34 pp above) | Keep tests aligned with new UI behavior. |

The backend tests were added in `backend/tests/test_moderation.py`; they test
real FastAPI routes against the existing in-memory MongoDB fixture and do not
contact Atlas. Remaining backend gaps include `controllers/location.py` (20%),
`controllers/user.py` (51%), and `routes/moderation.py` (57% after the new
tests). Follow-up tests should cover location not-found/update cases, user
controller duplicate/role transitions, and moderator endpoints not yet covered.

Frontend statements, branches, and functions retain their existing 50% gates
because their measured results remain below the 70% course target. Frontend
lines remain at 70%. The next meaningful frontend work is focused specs for
moderation API/dashboard request outcomes, rankings page authentication and
rating-edit flows, and user-profile load/error behavior. These lower gates are
documented honestly; no threshold is lowered and no behavior was changed.

## Team review responsibilities

- Ashley: review the DFD and architecture.
- Sara: review STRIDE threats and prioritize risks.
- Terra: verify existing controls.
- Helen: review documentation and OWASP ownership.

This is a draft. It does not complete the OWASP checklist or declare final
vulnerability findings.
