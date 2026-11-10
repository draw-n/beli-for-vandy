# Sprint 4 remediation findings

This is a scanner-advisory triage record, not a manual OWASP assessment or a
claim that every advisory is exploitable in Beli. The package audit results
were checked against the current dependency paths and application calls. The
secret alert is documented without its matched value.

## Pillow 12.3.0 records

`pip-audit` 2.10.1 reported 39 records on the direct dependency
`backend/requirements.txt` → `Pillow==12.3.0`; it did not emit severity. The
severity column below uses Pillow 13.0.0's upstream release classification.
The records all report Pillow **13.0.0** as the fix. Source evidence is
`backend/controllers/photo_storage.py`; regression coverage is
`backend/tests/test_photo_storage.py` and `backend/tests/test_photos.py`.

| Advisory ID(s) | Upstream severity | Evidence / applicability | Fix and regression evidence | Resolution |
| --- | --- | --- | --- | --- |
| CVE-2026-96639 | Critical | Multi-frame mode transition. The app rejects `n_frames != 1`, but calls `Image.open()` before that check; parser reachability needs verification. | Pillow 13.0.0. Tests cover multi-frame rejection only if supported by fixtures; existing JPEG/PNG/WebP, validation and size tests must pass. | Fixed in remediation PR; exploitability not confirmed. |
| CVE-2026-112398; CVE-2026-112403 | Critical | JPEG decoder buffer overflows associated with draft/scaled decode. JPEG is accepted; code calls `image.load()` before `thumbnail()`, so verify whether the vulnerable draft path is reachable in this order. | Pillow 13.0.0. Run JPEG processing and resizing tests plus the full backend suite. | Fixed in remediation PR; exploitability not confirmed. |
| CVE-2026-96644 | High | WMF/EMF parser; format is rejected after `Image.open()`. Verify whether parsing alone reaches the vulnerable code. | Pillow 13.0.0; run unsupported/corrupt image validation tests. | Fixed; applicability needs verification. |
| CVE-2026-96637 | High | SPIDER decompression-bomb/seek path; format is not accepted and the app does not seek frames. `Image.open()` precedes format rejection. | Pillow 13.0.0; run unsupported/multiframe validation tests. | Fixed; applicability needs verification. |
| CVE-2026-96643 | High | Repeated EXIF header handling; accepted JPEG/PNG inputs may carry EXIF, and the app calls `ImageOps.exif_transpose()`. Triggerability needs verification. | Pillow 13.0.0; run EXIF orientation and metadata-stripping test. | Fixed; applicability needs verification. |
| CVE-2026-96778 | High | JPEG comment write after ICC data; the app can re-encode JPEG input. Whether its selected output path reaches this encoder case needs verification. | Pillow 13.0.0; run JPEG compression, metadata and ICC-profile coverage. | Fixed; applicability needs verification. |
| CVE-2026-112395; CVE-2026-112404; CVE-2026-112897 | High | TIFF decoder out-of-bounds/uninitialized reads; TIFF is rejected, but only after `Image.open()`. Confirm whether vulnerable decode work occurs before rejection. | Pillow 13.0.0; run unsupported-format and corrupt-image tests. | Fixed; applicability needs verification. |
| CVE-2026-112896; CVE-2026-112393 | High | TIFF encoder memory issues; the app encodes only JPEG, PNG and WebP, not TIFF. | Pillow 13.0.0; existing JPEG/PNG/WebP output tests. | Fixed; no TIFF encoding call found. |
| CVE-2026-112895; CVE-2026-96640 | High | PDF parser/resource-exhaustion paths require PDF append/save operations; no such operation exists in the photo controller. | Pillow 13.0.0; existing supported-format tests. | Fixed; triggering operation not found. |
| GHSA-78g4-xqwv-q3g8 | High | Bundled OpenJPEG decoder; JPEG 2000 is not in the accepted-format set but is passed to `Image.open()` before rejection. | Pillow 13.0.0; run unsupported-format validation tests. | Fixed; parser reachability needs verification. |
| CVE-2026-112396 | Medium | TIFF encoder use-after-free; application does not encode TIFF. | Pillow 13.0.0; existing output-format tests. | Fixed; triggering operation not found. |
| CVE-2026-96636 | Medium | MPO/DCX multiframe seek; unsupported format and no frame seek. Format rejection occurs after open. | Pillow 13.0.0; run unsupported/multiframe validation tests. | Fixed; applicability needs verification. |
| CVE-2026-112406; CVE-2026-112894; CVE-2026-112391 | Medium | PDF append/save parser and resource paths; the app does not append to or write PDFs. | Pillow 13.0.0; existing photo processing tests. | Fixed; triggering operations not found. |
| CVE-2026-112399 | Medium | APNG disposal/decompression path. APNG may identify as PNG, but the app rejects multiframe images before verify/load; parser-stage reachability needs verification. | Pillow 13.0.0; run PNG and multiframe validation tests. | Fixed; applicability needs verification. |
| CVE-2026-96642 | Medium | TarIO negative-size loop; no TarIO use found. | Pillow 13.0.0; existing photo processing tests. | Fixed; triggering operation not found. |
| CVE-2026-96638 | Medium | BMP RLE decoder; BMP is rejected after `Image.open()`. | Pillow 13.0.0; run unsupported-format validation tests. | Fixed; parser reachability needs verification. |
| CVE-2026-112892 | Medium | MSP RLE decoder; MSP is not accepted and is rejected after open. | Pillow 13.0.0; run unsupported-format validation tests. | Fixed; parser reachability needs verification. |
| CVE-2026-112901 | Medium | XBM header ReDoS; XBM is not accepted and is rejected after open. | Pillow 13.0.0; run unsupported/corrupt image tests. | Fixed; parser reachability needs verification. |
| CVE-2026-112390; CVE-2026-112401; CVE-2026-112891 | Medium | MIC/GIF frame/comment paths; neither format is accepted and the app does not save/seek GIF frames. | Pillow 13.0.0; run unsupported/multiframe validation tests. | Fixed; applicability needs verification. |
| CVE-2026-112392 | Medium | Rank filter on zero-size images; the app does not call rank/median/min/max filters. | Pillow 13.0.0; existing image dimension boundary tests. | Fixed; triggering operation not found. |
| CVE-2026-96641 | Medium | PILfont text-width arithmetic; no font rendering calls found. | Pillow 13.0.0; existing photo processing tests. | Fixed; triggering operation not found. |
| CVE-2026-112405 | Medium | `Image.merge()` buffer issue; no merge call found. | Pillow 13.0.0; existing RGB/RGBA format tests. | Fixed; triggering operation not found. |
| CVE-2026-112893 | Medium | FreeType glyph cleanup; no font rendering calls found. | Pillow 13.0.0; existing photo processing tests. | Fixed; triggering operation not found. |
| CVE-2026-112402 | Medium | `Image.transform()` allocation-failure path; no transform call found. | Pillow 13.0.0; existing resize tests. | Fixed; triggering operation not found. |
| CVE-2026-112394 | Medium | P;2L/P;4L raw decoder; app accepts JPEG/PNG/WebP only. The decoder’s reachability before format rejection needs verification. | Pillow 13.0.0; run unsupported/corrupt image tests. | Fixed; applicability needs verification. |
| CVE-2026-112900 | Medium | EPS filename argument injection through Ghostscript; no EPS processing or Ghostscript call found. | Pillow 13.0.0; existing photo processing tests. | Fixed; triggering operation not found. |
| CVE-2026-114501 | Medium | Arrow export; no Arrow/image-array export call found. | Pillow 13.0.0; existing photo processing tests. | Fixed; triggering operation not found. |
| CVE-2026-112400 | Low | GIF seek/decompression check; GIF is unsupported and the app does not seek frames. | Pillow 13.0.0; run unsupported-format validation tests. | Fixed; applicability needs verification. |
| CVE-2026-112899 | Low | EPS decompression-bomb bypass through Ghostscript; no EPS/Ghostscript operation found. | Pillow 13.0.0; existing photo processing tests. | Fixed; triggering operation not found. |
| CVE-2026-112397 | Low | `ImageMorph.MorphOp.apply()` zero-width path; no ImageMorph call found. | Pillow 13.0.0; existing dimension tests. | Fixed; triggering operation not found. |

All existing photo tests passed after the update: 44 photo tests, including
JPEG/PNG/WebP processing, EXIF, transparency, resize, corrupt/unsupported input,
byte-size boundaries and pixel-count boundaries. The complete backend suite
passed 147 tests with one local MongoDB integration test skipped. These tests
are regression checks, not vulnerability-specific proof of exploitability.

## npm audit findings

The pre-remediation audit counted 42 affected-package entries (6 High, 36
Moderate, 0 Critical), but those were not unique vulnerabilities. After the
targeted updates the audit reports 36 affected-package entries: **0 High, 0
Critical, 36 Moderate**, representing 9 unique advisories below. All affected
packages are frontend/build/test tooling; confirm reachability before treating
them as Beli application vulnerabilities. `npm audit --audit-level=high` exits
0 with this remaining set.

| Advisory ID | Dependency/path and current version | Reported severity | Evidence / applicability | Fix / tests | Resolution |
| --- | --- | --- | --- | --- | --- |
| GHSA-qxg6-89mg-rqv8; GHSA-xp26-3454-mjgp | `vitest@4.1.11` → `@vitest/mocker@4.1.11` | Moderate | Vitest test tooling only. | npm reports `@vitest/coverage-v8@4.1.12`, outside its exact `4.1.11` manifest pin; keep for follow-up review. Unit tests pass. | Not changed; no High/Critical. |
| GHSA-w74x-v6f9-j3xg; GHSA-wjr9-j795-jxcr | `@angular/cli` / Angular devkit → `ajv` → `fast-uri@3.1.8` | Moderate | Build/CLI dependency path. | npm reports a compatible fix; audit dry run identified `fast-uri@3.1.9`. | Not changed; no High/Critical. |
| GHSA-333x-w4r6-6crp; GHSA-xhq7-xmqj-769h | `@angular/cli` / Angular devkit → `ajv` → `fast-uri@3.1.8` | Low | Same build/CLI package as the Moderate `fast-uri` advisories. | Compatible update is available; no application code uses `fast-uri` directly. | Not changed; no High/Critical. |
| GHSA-3g3m-2fjr-6pw4 | Angular CLI → `pacote` → `@npmcli/package-json` → `glob@13.0.6` | Moderate | CLI dependency tooling; no runtime application path found. | npm's automatic fix requires `@angular/cli@22.2.6`, a major upgrade, so deferred. | Not changed; no High/Critical. |
| GHSA-g3hv-75wg-m249 | ESLint/tooling dependency graph → `minimatch` | Moderate | Lint/build tooling only. | npm's automatic fix requires ESLint 9.39.5, a major-version downgrade from ESLint 10.12.0; deferred. | Not changed; no High/Critical. |
| GHSA-rxp7-6hxx-x8q5 | Angular CLI/npm registry tooling → `ip-address@10.7.2` | Moderate | Build-time dependency; no application runtime use found. | npm reports a compatible fix; follow-up can target the package path. | Not changed; no High/Critical. |

### High findings fixed in this remediation

The 9 unique High advisory IDs were cleared by updating only the affected
dependency paths:

| Advisory IDs | Affected package/path | Version changes | Applicability and regression evidence |
| --- | --- | --- | --- |
| GHSA-22jm-h49p-29qw; GHSA-46jr-4wx8-v453 | `@angular/cli` → `@modelcontextprotocol/sdk` | CLI 21.2.27→21.2.29; SDK 1.31.0→1.32.1 | CLI/dev tooling; no app MCP server/client usage found. Lint, typecheck, unit/integration tests run. |
| GHSA-27r3-jxmh-p828 | Express dependency → `body-parser` | 2.3.0→2.4.0 | Frontend tooling path; Node 22.12 CI does not enable body-parser's newer Zstandard feature. Frontend checks run. |
| GHSA-68fv-2mgg-jv7q | Angular build/PostCSS and Sass → `source-map-js` | 1.2.1→1.2.2 | Build tooling; Sass's range permits the patch. Build attempt and frontend tests run. |
| GHSA-xjj6-f33q-929c; GHSA-4w7w-5xrc-9h26; GHSA-2m5v-pch6-74hx; GHSA-qrxm-fqhp-jwvm | Angular build → `undici` | Angular build 21.2.27→21.2.29; undici 7.29.1→7.30.1 | Dev build tool path; the advisory-specific shared-cache condition needs verification. Frontend checks run. |
| GHSA-587h-7wmj-h5pm | Angular build/Vitest → `vite` | Angular build 21.2.27→21.2.29; Vite 7.3.6→7.3.7 | Dev/build tooling; Windows launch-editor scenario not used in this macOS test run. Frontend tests run. |
| GHSA-xjj6-f33q-929c; GHSA-2m5v-pch6-74hx; GHSA-qrxm-fqhp-jwvm | Angular CLI → `pacote` → `node-gyp` → nested `undici` | Nested undici 6.28.1→6.29.1 via a node-gyp-only npm override | Resolves the separate 6.x vulnerable path; no application runtime usage found. npm audit verifies no High/Critical remain. |

## Historical Gitleaks alert

Gitleaks 8.30.1 identified one `generic-api-key` match at
`backend/tests/test_account_api.py:260`, commit
`9058127463ee11d7285d2ce91c8e16413a31a894`. The exact finding fingerprint is
stored in `.gitleaksignore`; its value is not stored here. Redacted inspection
showed the line is inside a test whose name says it rejects a mock cookie. The
literal is UUID-shaped and is used only in that test context in the reviewed
historical file. This supports classification as a synthetic fixture; it does
not prove the value was never reused elsewhere. No live credential evidence was
found in this review, so no rotation was initiated. The single-fingerprint
ignore preserves full-history scanning and does not ignore new matches in the
same file or rule.

## Fixing PR and remaining review

- Fixing PR: [#73](https://github.com/draw-n/beli-for-vandy/pull/73), targeting
  `main` from `sara/security-remediation`.
- Fixing commit: `ad53d2e6ae9a146f1faa57ae2ebb45035785a117`.
- Outstanding: owner may validate the synthetic
  test fixture; team should triage the nine remaining Moderate/Low npm IDs and
  applicability questions above.
- This document does not complete the manual OWASP checklist or the overall
  security audit.
