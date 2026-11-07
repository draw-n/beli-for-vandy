# Security scanning and coverage

## CI security stage

The `CI / Security gate` job runs in parallel with `CI / Quality gate` for every
pull request targeting `main` and every push to `main`. It runs Semgrep against
backend and Angular application source, `pip-audit` against the exact-pinned
Python requirements, `npm audit --audit-level=high` against the frontend lockfile,
and Gitleaks across all fetched Git history. The staging deployment depends on
both jobs and remains limited to pushes to `main`.

The SAST scanner uses Semgrep CLI 1.182.0 and the maintained `p/python` and
`p/typescript` rulesets. Its gate maps CVSS-like `security-severity` scores of
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
reported vulnerable dependencies; because its CLI does not expose a reliable
High/Critical threshold, this also blocks on lower-severity advisories. Its
output includes advisory identifiers and fix versions; confirm the dependency
path against the pinned requirements and dependency tree. `npm audit` uses npm
11.7.0, prints dependency paths and available fixes, and fails at High or Critical.
Gitleaks 8.30.1 scans full history with full redaction. No secret values are
written to workflow output or artifacts.

No security scanner is configured with `continue-on-error`, ignored exit codes,
or blanket finding suppressions. Scanner installation and execution failures
fail the job. The PR job has `contents: read` permission and no deployment
secrets.

### Require the security status check

GitHub Actions failures do not block merges unless the check is required in the
repository ruleset. A repository administrator should edit the ruleset applying
to `main`, enable **Require status checks to pass**, and add the exact check
**`CI / Security gate`** (workflow name `CI`, job name `Security gate`). Keep the
existing `CI / Quality gate` requirement. This PR does not change repository
settings. Verify the name in a completed PR check run if GitHub displays a
different context for the repository.

## Reproduce scans

Run from the repository root. These commands scan application source and the
tracked dependency inputs; Gitleaks scans every locally available ref and commit.

```bash
python3 -m pip install semgrep==1.182.0 pip-audit==2.10.1
semgrep scan --config p/python --config p/typescript --metrics=off \
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

Measured on the current `main` snapshot `eedec37` with the existing suites:
backend pytest had 147 passed and 1 skipped; Angular had 134 passed. The values
below are the baseline before this PR’s gate changes.

| Suite / metric | Measured | Gate in this PR | Gap to 70% | Useful next test targets |
| --- | ---: | ---: | ---: | --- |
| Backend combined | 67.96% | 65% | 2.04 pp | Add focused moderation controller/route tests; extend location and user controller edge-case coverage. |
| Frontend statements | 66.99% | 50% | 3.01 pp | Moderation API and dashboard behavior; user profile loading and error states. |
| Frontend branches | 60.79% | 50% | 9.21 pp | Moderator/admin route guard branches and moderation queue/action error paths. |
| Frontend functions | 60.86% | 50% | 9.14 pp | Moderation dashboard actions and user-profile methods currently lacking direct component specs. |
| Frontend lines | 72.28% | 70% | 0 pp (2.28 pp above) | Keep testing new flows as behavior changes. |

The backend’s largest current coverage gaps are `backend/controllers/moderation.py`
(11%), `backend/controllers/location.py` (20%), `backend/controllers/user.py`
(51%), and `backend/routes/moderation.py` (41%). Meaningful additions belong in
a new `backend/tests/test_moderation.py`, and in focused cases in
`backend/tests/test_locations.py` and `backend/tests/test_user_controller.py`.
On the frontend, `frontend/src/app/api/moderation.api.ts` and the moderation
dashboard have little or no direct spec coverage; add behavior-focused specs
there and for `frontend/src/app/user-profile/user-profile.ts`. These are
follow-up targets, not tests added to inflate this PR’s coverage.

Backend gates are 65% in both `.coveragerc` and the CI pytest command. Frontend
lines are gated at 70%; statements, branches, and functions remain at 50% because
their measured results are below 70%. No threshold is lowered.

## Team review responsibilities

- Ashley: review the DFD and architecture.
- Sara: review STRIDE threats and prioritize risks.
- Terra: verify existing controls.
- Helen: review documentation and OWASP ownership.

This is a draft. It does not complete the OWASP checklist or declare final
vulnerability findings.
