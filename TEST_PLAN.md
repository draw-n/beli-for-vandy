# Test Plan — Beli for Vanderbilt
Sprint 3 | Owner: Helen Wu

## Baseline (October 2026)
Tests: 117 Angular unit tests, 130 backend tests, and 1 Playwright cross-stack test passed locally.
Branch coverage: Angular 68.33%; overall combined branch coverage is not separately available. Backend's latest 83.58% is a combined coverage total, not a branch-coverage figure.

## Targets
Branch coverage >= 70% overall
Branch coverage >= 85% on core modules

Targets are not yet verified as met. The backend CI coverage gate reports combined coverage and does not separately establish these branch targets.

## Priorities (from risk map)

| Feature | Priority | Unit | Integration | E2E | Owner |
|---|---|---|---|---|---|
| Account registration | P0 | Tested | Tested with isolated persistence | Tested | Helen Wu |
| Login | P0 | Tested | Tested with real HTTP to isolated FastAPI | Tested | Helen Wu |
| Upload photo with rating/review/date | P0 | Partial: upload and rating behavior tested; historical 1–5 scale unmet | Tested with isolated GridFS fake | Tested | Helen Wu |
| Edit own review | P0 | Partial: text-only authorization gap characterized | Tested with isolated persistence; author-only text edit unmet | Tested | Helen Wu |
| Delete own review | P0 | Partial: unauthenticated behavior characterized | Tested with isolated persistence; author-only delete unmet | Tested | Helen Wu |
| Review update visible within five seconds | P0 | Component refresh behavior tested | Tested with real HTTP | Create timed; edit/delete not separately timed | Helen Wu |

These are Sprint 3 acceptance-story numbers, not GitHub issue IDs or the original 24-story backlog. Results above reflect local Phase B–D validation; GitHub-hosted workflow verification remains pending.

## Integration seams to test
- Account route → controller → MongoDB: route/controller tests use isolated fake collections; not tested against real MongoDB.
- Angular login → AccountApi → FastAPI authentication: HttpTestingController mocks the service boundary; Playwright separately tests real browser HTTP to isolated FastAPI.
- Review dialog → ReviewApi → FastAPI review routes: mocked service tests plus real Playwright HTTP; persistence is in-memory.
- Photo upload → authentication → GridFS → review attachment: Playwright exercises the flow with fake GridFS; real GridFS/Atlas behavior is untested.
- Review submission → location-profile refresh → aggregate ratings: Playwright verifies visible updates and aggregates; one local create update measured 183 ms from successful API response to visible review (5,000 ms limit). This single local run does not establish production performance.

## Critical E2E journeys (max 3)
- Registration → login → access application: Playwright verifies valid/invalid credentials, JWT issuance and browser token storage, then loads dining locations and reviews.
- Login → create/edit/delete review → see updated ratings: Playwright verifies review CRUD and aggregate updates; create became visible 183 ms after the successful FastAPI response in one local run, below 5,000 ms. This is not a production performance guarantee.
- Login → upload photo → attach to review → view photo: Playwright verifies authenticated upload, attachment, retrieval, review/gallery display, and public-profile navigation. The test uses real Angular-to-FastAPI HTTP with isolated in-memory Mongo-compatible persistence and fake GridFS, not MongoDB Atlas.

## Not testing (and why)
- MongoDB Atlas availability, replication, and real GridFS behavior: tests use isolated fakes and must not depend on shared student data.
- Third-party framework internals or pixel-perfect rendering: tests cover app behavior, not framework implementation or visual design matching.
- Features outside these six Sprint 3 stories: excluded from acceptance scope, though some regression tests exercise them.
- The historical photo-review story requires ratings 1–5; the current UI uses 1–10 and backend integer validation has no range limit. Text-only review edits and deletes remain unauthenticated, so author-only requirements are unmet.

## How to run
- Backend unit tests (repository root): `python -m pytest backend/tests/test_user_models.py backend/tests/test_user_controller.py backend/tests/test_account_api.py`
- Backend route/integration tests (repository root; isolated test fixtures): `python -m pytest backend/tests/test_reviews.py backend/tests/test_locations.py backend/tests/test_follows.py`
- Backend full-suite coverage (repository root): `python -m pytest --cov=backend --cov-config=.coveragerc --cov-report=term-missing --cov-fail-under=50`
- Angular unit tests (`frontend/`): `npm run test:unit`
- Playwright cross-stack test (`frontend/`): `npm run test:integration` (real HTTP to isolated FastAPI; install Chromium with `npx playwright install --with-deps chromium`)
- TypeScript, lint, and production build (`frontend/`): `npm run typecheck`; `npm run lint`; `npx ng build`
- Backend lint (repository root): `ruff check backend`
