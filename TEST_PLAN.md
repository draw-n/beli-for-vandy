# Test Plan: Beli for Vanderbilt | Sprint 3 | Owner: Helen Wu

## Scope

Testing is limited to these user stories:

1. Create an account with email, username, and password.
2. Log in with username and password.
3. Upload a photo with a 1–5 rating, review text, and date.
4. Edit my own rating and review.
5. Delete my own rating and review.
6. Show an updated review in the browser within five seconds.

Account deletion, follows, dining-location CRUD, search, hours, meal filters, and layout are outside this sprint's test work.

## Baseline (October 8, 2026)

Command:

```bash
backend/.venv/bin/python -m pytest \
  --cov=backend \
  --cov-branch \
  --cov-report=term-missing
```

| Measure | Result |
| --- | ---: |
| Tests | 51 passed |
| Combined coverage | 89.63% |
| Statement coverage | 91.28% (827 of 906) |
| Branch coverage | 63.79% (37 of 58) |
| Failed, skipped | 0, 0 |

This is the repository-wide backend result, not the six-story result. It includes test modules, follow code, location code, and seed code because the command uses `--cov=backend`. The focused baseline will be recorded after the story tests exist.

Current coverage for code touched by these stories:

| Module | Combined coverage |
| --- | ---: |
| `backend/controllers/review.py` | 100% |
| `backend/models/review.py` | 100% |
| `backend/routes/review.py` | 100% |
| `backend/controllers/user.py` | 89% |
| `backend/models/user.py` | 100% |
| `backend/routes/user.py` | 90% |

High line coverage does not prove the user stories. The current review tests do not prove a 1–5 limit, photo transfer, author-only writes, or the five-second browser update.

## Targets

- At least 70% branch coverage across the account and review backend modules.
- At least 85% branch coverage in review model, controller, and route code.
- Every acceptance check below passes.
- No skipped tests for the six stories.
- The five-second requirement uses a measured clock, not a manual observation.

## Acceptance checks

| Story | Priority | Unit | Integration | E2E | Pass condition |
| --- | --- | --- | --- | --- | --- |
| Create account | P0 | Yes | Yes | Yes | A valid email, unique username, and password create one account; invalid email, short password, duplicate email, and duplicate username are rejected; no password or hash appears in the response. |
| Log in | P0 | Yes | Yes | Yes | The saved username and password return the account; an unknown username or wrong password returns the same generic error. |
| Upload photo and review | P0 | Yes | Yes | Yes | The request carries photo data or a stored photo reference, an integer rating from 1 through 5, review text, and a date; ratings below 1, above 5, or fractional are rejected. |
| Edit own review | P0 | Yes | Yes | Yes | The author can change rating and text; another account cannot; author, location, creation date, and photo ownership stay unchanged. |
| Delete own review | P0 | Yes | Yes | Yes | The author can delete the review; another account cannot; a rejected delete leaves the record intact. |
| Browser update under five seconds | P0 | Yes | Yes | Yes | After create, edit, or delete succeeds, the visible review list, count, and average match the API state within 5,000 ms. |

## Test cases to write

### Account creation and login

- Create an account, then query the fake MongoDB collection and check the normalized email, unique username, and password hash.
- Submit malformed email, missing username, and passwords shorter than the contract permits.
- Create duplicate-email and duplicate-username records and check for `409 Conflict`.
- Log in with the saved username and password.
- Check wrong-password and unknown-user responses for the same status and message.
- Check that account responses omit `password` and `password_hash`.

### Photo review creation

- Submit one photo, rating `1`, review text, and an ISO 8601 date.
- Repeat with rating `5`.
- Reject ratings `0`, `6`, and `2.5`.
- Reject missing photo, rating, review text, or date.
- Check that the stored review points to the stored photo and keeps the submitted date.
- Check photo-storage failure: no partial review record may remain.

### Review ownership

- Update rating and text as the author.
- Try the same update as another account and expect `403 Forbidden` with no database change.
- Try to change author, location, creation date, or photo owner and expect rejection or ignored immutable fields, according to the API contract.
- Delete as the author and verify the record is gone.
- Delete as another account and expect `403 Forbidden`; verify the record remains.
- Request update or delete for an unknown review and expect `404 Not Found`.

### Five-second browser update

- After create succeeds, check that the new review, count, and average appear before a 5,000 ms deadline.
- After edit succeeds, check that the new rating, text, and average appear before the deadline.
- After delete succeeds, check that the review disappears and the count and average change before the deadline.
- Hold the API response open and check that the browser does not display an unconfirmed change.
- Return an API error and check that the prior review state remains visible.

Use fake timers for component tests. Keep one browser test with a real monotonic timer to cover the full five-second path.

## Integration seams

- Account HTTP route, `UserController`, password hashing, and MongoDB `users` collection.
- Login form, `AccountApi`, account login route, and browser account state.
- Photo input, photo storage boundary, review route, review controller, and MongoDB `reviews` collection.
- Signed-in account identity, review update/delete route, ownership check, and stored review.
- Review dialog, `ReviewApi`, location profile refresh, count calculation, and average calculation.

MongoDB tests use `mongomock-motor`. No live Atlas credentials belong in test configuration.

## Known contract gaps

- The Angular form currently accepts ratings from 1 through 10. This story requires 1 through 5.
- Reviews currently accept `photo_ids`; there is no photo upload endpoint or storage adapter.
- Review update and delete routes receive no caller identity. Author-only writes cannot be enforced by the backend yet.
- The browser refreshes after a successful response, but no test measures the five-second limit.
- The project stores a mock account in session storage. The tests will use that existing boundary and will not add token or session work.

These gaps must be resolved before their acceptance tests can pass. This document does not implement those changes.

## Not testing

- Account deletion: absent from the selected stories.
- Follow relationships and friends' reviews: absent from the selected stories.
- Dining-location create, update, delete, search, and hours: only the location page's review refresh is in scope.
- Meal-type filtering: absent from the selected stories.
- MongoDB Atlas availability, replication, and backups: owned by the provider; tests use an async fake.
- Angular Material internals and pixel matching: test application state and visible output.

## Planned commands

Backend story tests and branch coverage:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_account_user_stories.py \
  backend/tests/test_review_user_stories.py \
  --cov=backend.controllers.security \
  --cov=backend.controllers.user \
  --cov=backend.models.user \
  --cov=backend.routes.user \
  --cov=backend.controllers.review \
  --cov=backend.models.review \
  --cov=backend.routes.review \
  --cov-branch \
  --cov-report=term-missing \
  --cov-fail-under=70
```

Frontend component tests:

```bash
cd frontend
npm test -- --watch=false
```

The two named backend test files are planned names. They do not exist yet.
