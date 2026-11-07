# Automated scan results

## Run record

- Repository snapshot: `origin/main` at `eedec371c63f81f49be3c06a54897f7d9670dd59`
- Scan date: 2026-11-07 (local run; hosted CI has not run for this change)
- Semgrep: 1.182.0; 63 targeted application source files (93 tracked candidate files before exclusions); `p/python` and `p/typescript`.
- pip-audit: 2.10.1; `backend/requirements-dev.txt` and included `backend/requirements.txt`.
- npm audit: npm 11.7.0; `frontend/package-lock.json`, `--audit-level=high`.
- Gitleaks: 8.30.1; 132 commits across available refs, full redaction.
- CI check context: `CI / Security gate` (not yet observed on GitHub).

Commands used (scanner output stays in `/private/tmp` when structured output is
needed):

```bash
SEMGREP_SEND_METRICS=off semgrep scan --config p/python --config p/typescript \
  --metrics=off --json --exclude '*.spec.ts' --exclude '**/tests/**' \
  --exclude '**/node_modules/**' --exclude '**/.venv/**' --exclude '**/dist/**' \
  --exclude '**/coverage/**' --exclude '**/playwright-report/**' \
  backend/main.py backend/settings.py backend/database.py \
  backend/controllers backend/models backend/routes frontend/src
pip-audit --requirement backend/requirements-dev.txt --format=columns
(cd frontend && npm exec --yes --package=npm@11.7.0 -- npm audit --audit-level=high)
gitleaks git --redact=100 --log-opts=--all .
```

The local Gitleaks 8.30.1 macOS binary was checksum-verified against the
official release before scanning. The local Docker daemon was unavailable, so
the workflow’s digest-pinned Gitleaks container was not run locally; hosted CI
must verify that action step.

## Findings by severity

The results below are from the pinned local scanner runs. No dependency fixes
were applied. The only secret-scan location is recorded without a matched value.

| Severity | SAST | Python advisories | npm advisories | Secret findings |
| --- | --- | --- | --- | --- |
| Critical | 0 | Severity not emitted | 0 | Gitleaks does not assign this severity |
| High | 0 | Severity not emitted | 6 vulnerable package entries (19 advisory references) | Gitleaks does not assign this severity |
| Medium | 0 | Severity not emitted | 36 vulnerable package entries | Gitleaks does not assign this severity |
| Low / Info | 0 | Severity not emitted | 0 | Gitleaks does not assign this severity |
| Unclassified | — | 39 advisories in `pillow` 12.3.0 | — | 1 potential `generic-api-key` alert |

### Python dependency advisories

`pip-audit` exited 1: 39 advisories affect the direct dependency
`backend/requirements.txt` → `Pillow==12.3.0`; the scanner reports
`Pillow==13.0.0` as the fix version for all 39. The pip-audit columns output
does not include CVSS severity, so these remain unclassified pending team
triage; the gate fails on any pip-audit advisory, including these. Advisory IDs:

`PYSEC-2026-4327`, `PYSEC-2026-4328`, `PYSEC-2026-4326`, `PYSEC-2026-4339`,
`PYSEC-2026-4340`, `PYSEC-2026-4343`, `PYSEC-2026-4334`, `PYSEC-2026-4337`,
`PYSEC-2026-4341`, `PYSEC-2026-4330`, `PYSEC-2026-4338`, `PYSEC-2026-4335`,
`PYSEC-2026-4336`, `PYSEC-2026-4331`, `PYSEC-2026-4332`, `PYSEC-2026-4329`,
`PYSEC-2026-4333`, `PYSEC-2026-4342`, `CVE-2026-112895`, `CVE-2026-112400`,
`CVE-2026-112897`, `CVE-2026-112395`, `CVE-2026-112404`, `CVE-2026-112899`,
`CVE-2026-112900`, `CVE-2026-112893`, `CVE-2026-112891`, `CVE-2026-112390`,
`CVE-2026-112401`, `CVE-2026-112391`, `CVE-2026-112894`, `CVE-2026-112406`,
`CVE-2026-112399`, `CVE-2026-112892`, `CVE-2026-112393`, `CVE-2026-96638`,
`CVE-2026-96640`, `CVE-2026-96778`, `GHSA-78g4-xqwv-q3g8`.

### High npm advisories

`npm audit --audit-level=high` exited 1 with 42 package entries total: 6 High,
36 Moderate, 0 Critical. The High entries all report a fix available; no
`npm audit fix` was run.

| Vulnerable package | Dependency path(s) in the lockfile | High advisory IDs | Fix |
| --- | --- | --- | --- |
| `@modelcontextprotocol/sdk` | `@angular/cli` → SDK | `GHSA-22jm-h49p-29qw`, `GHSA-46jr-4wx8-v453`, `GHSA-rvq5-wwqv-78pq`, `GHSA-6prh-2h8m-c8cw` | npm reports fix available |
| `@angular/cli` | Direct dependency; affected through vulnerable dependency chain including the SDK above | Same SDK advisories are reflected in the CLI entry | npm reports fix available |
| `body-parser` | `express` → `body-parser` | `GHSA-27r3-jxmh-p828` | npm reports fix available |
| `source-map-js` | `@angular/build` → `postcss` → `source-map-js`; also `sass` → `source-map-js` | `GHSA-68fv-2mgg-jv7q` | npm reports fix available |
| `undici` | `@angular/build` → `undici`; `@angular/cli` → `pacote` → `@npmcli/run-script` → `node-gyp` → `undici` | `GHSA-4qv8-2p9j-2685`, `GHSA-f72v-6w45-q472`, `GHSA-xjj6-f33q-929c`, `GHSA-4w7w-5xrc-9h26`, `GHSA-2m5v-pch6-74hx`, `GHSA-qrxm-fqhp-jwvm`, `GHSA-9fm3-97px-rjf6`, `GHSA-55wc-3pg8-jfw6` | npm reports fix available |
| `vite` | `@angular/build` → `vite`; `vitest` → `vite` | `GHSA-698v-4r3x-3vcv`, `GHSA-r825-w8mm-5pxw`, `GHSA-587h-7wmj-h5pm`, `GHSA-9jrq-w75r-8gcw`, `GHSA-rq7h-c2jc-7f22` | npm reports fix available |

### Secret scan

Gitleaks exited 1 after scanning 132 commits. It reported one redacted
`generic-api-key` match in historical `backend/tests/test_account_api.py:260`
at commit `9058127463ee11d7285d2ce91c8e16413a31a894`. The match is in a test
file, but its validity has not been manually established; treat it as a
potential credential pending owner review. The matched value is intentionally
not recorded here or in the PR description.

## Successful scan

Semgrep 1.182.0 completed successfully with exit status 0: 0 findings across 63 targeted source
files, with 225 Python and TypeScript rules. The configured exclusions skipped
17 files; no scanner errors were reported.

The local Semgrep gate parser was also checked with synthetic reports: a High
finding exited 1, a Medium finding exited 0, and both a scanner error and
malformed JSON exited 2. These inputs contained no real application findings
or secret values.

## CI behavior

The exact expected status check is `CI / Security gate`. Semgrep High/Critical
findings fail; scanner errors and invalid JSON fail closed. `pip-audit` fails
on any advisory it reports; `npm audit --audit-level=high` fails on High or
Critical advisories. Gitleaks findings fail with output redacted. Tool
installation and scanner execution failures are nonzero failures. The hosted
workflow has not yet run, so no GitHub Actions result is claimed.

## Preliminary triage (team to complete)

- Scanner severity is preliminary and may not match the course impact definitions.
- Confirm reachability and exploitability before treating advisories as application findings.
- Review potential live-secret alerts without exposing the secret value; route rotation separately.
- Assign owner and final severity during the team review; no final manual review is claimed.
