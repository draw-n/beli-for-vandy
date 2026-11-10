[![CI](https://github.com/draw-n/beli-for-vandy/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/draw-n/beli-for-vandy/actions/workflows/ci.yml)

# beli-for-vandy

Contributors: Eileen Luo: eileen.luo@vanderbilt.edu, Helen Wu: helen.wu@vanderbilt.edu, Ashley Lai: ashley.lai@vanderbilt.edu, Sara Ota: sara.ota@vanderbilt.edu, Terra Jang: terra.jang@vanderbilt.edu

## About our project
Have you ever felt like you wasted a meal swipe at a Vanderbilt dining hall? Would you like to know what dishes are before you step foot in line? Do you have friends who try the new dining hall foods more often than you do? Introducing Beli for Vanderbilt: an application to see which foods are enjoyed by your friends! Like Beli, this is a reviewing application to allow users to share ratings and reviews of each Vanderbilt dining hall and individual meals. Open to any faculty, staff and student at Vanderbilt University, it is the perfect way to verify another user’s opinion before trying something new.

## Core Features
- Create account
- View list of Vanderbilt dining halls with pictures to explore
- Add/remove new friends
- Be able to check friends' ratings and reviews
- Write dining hall reviews with integer ratings from 1 (lowest) to 10 (highest), and filter by breakfast, lunch, and dinner

### Rating scale

As a diner, you can rate a dining experience on a whole-number scale from 1
(lowest) to 10 (highest). The review form accepts only integer values in this
range. Dining hall average ratings are calculated as the arithmetic mean of the
available reviews, and the rating distribution groups reviews into 1–2, 3–4,
5–6, 7–8, and 9–10 buckets, showing each bucket's count and share of reviews.

**API validation note:** The backend currently requires ratings to be integers
but does not enforce the 1–10 range. Direct API requests can therefore submit
integer values outside the range enforced by the frontend; this README describes
the user-facing rating requirement, not a backend validation guarantee.

## Technologies
- MongoDB: uses a JSON format which is highly compatible with HTTP requests/responses
- Python: all of us have considerable experience with writing Python
- FastAPI
- Motor: asynchronous MongoDB access for the FastAPI backend; PyMongo is installed as a Motor dependency and supplies shared exceptions.
- Angular.js: This is a framework none of the members have tried previously
- TypeScript: great for ensuring we stick to consistent types, so there’s no unexpected field behavior
- Vercel: We will be deploying the project in Vercel since it provides a free hosting service for servers as long as they remain hobbyist projects (low traffic)
- (MongoDB) Atlas: database since it is also free with hobbyist projects

## Project Structure

```text
beli-for-vandy/
├── backend/                          # Python FastAPI service
│   ├── controllers/                  # Business logic
│   │   ├── security.py               # Password hashing helpers
│   │   └── user.py                   # User account operations
│   ├── models/                       # Pydantic app + database models
│   │   └── user.py                   # User-related data models
│   ├── routes/                       # FastAPI HTTP endpoints
│   │   └── user.py                   # User account routes
│   ├── tests/
│   ├── database.py                   # Asynchronous MongoDB connection
│   └── main.py                       # FastAPI application entry point
├── frontend/                         # Angular and TypeScript application
│   ├── public/                       # Static assets
│   ├── src/                          # Frontend source code
│   │   ├── app/                      # Angular components and configuration
│   │   │   ├── api/                  # HTTP clients for the FastAPI backend
│   │   │   ├── placeholder/          # Reusable placeholder page
│   │   │   │   ├── placeholder.component.css
│   │   │   │   ├── placeholder.component.html
│   │   │   │   └── placeholder.component.ts
│   │   │   └── types/                # Shared TypeScript types + interfaces
│   │   └── index.html                 # Browser document shell
│   └── tests/                        # Frontend automated tests
├── AGENTS.md                         # Project development guidance
└── README.md                         # Project overview and setup
```

## Installation

### Backend

Use Python 3.12 and install the pinned development dependencies:

```bash
python -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
```

Copy `backend/.env.example` to `backend/.env` and replace only the local values. Never
commit `.env` files or credentials.

### Frontend

Angular 21 requires a supported Node.js release; CI uses Node 22.12.0.

```bash
cd frontend
npm ci
npm start
```

The frontend uses `http://localhost:8000` by default. A deployment can supply another
absolute URL at build time:

```bash
API_BASE_URL=https://api.example.com npm run build
```

### Vercel CLI

Vercel is repository-wide deployment tooling for both applications, so install its CLI
globally rather than adding it to the frontend's runtime or development dependencies:

```bash
npm install --global vercel@63.1.2
vercel --version
vercel login
```

Create the applications as separate Vercel projects with these settings:

| Project | Root Directory | Framework Preset | Stable staging URL |
| --- | --- | --- | --- |
| `beli-for-vandy-frontend` | `frontend` | Angular | `https://beli-for-vandy-frontend.vercel.app` |
| `beli-for-vandy-backend` | `backend` | FastAPI | `https://beli-for-vandy-backend.vercel.app` |

Keep the framework defaults for dependency installation and the build command. The
frontend's `vercel.json` selects its Angular browser output and supplies the single-page
application fallback. Its build script reads `API_BASE_URL`; set it to the stable backend
URL at build time. The backend reads `MONGODB_URI` and `CORS_ORIGINS` at runtime. For
staging, set `CORS_ORIGINS` to a JSON array containing the stable frontend URL.

The Angular build uses static output mode. Data-independent routes are prerendered, while
routes that fetch FastAPI data are rendered in the browser. This keeps the frontend a
static Vercel deployment and avoids making database-backed API requests during the build.

Because each Vercel project already has a Root Directory, run Vercel CLI commands from
the repository root. Running them from `frontend/` or `backend/` makes Vercel resolve the
configured root twice. Select the intended project with `VERCEL_PROJECT_ID`:

```bash
export VERCEL_ORG_ID="your-team-id"
export VERCEL_TOKEN="your-access-token"

VERCEL_PROJECT_ID="your-backend-project-id" vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
VERCEL_PROJECT_ID="your-backend-project-id" vercel build --prod --token="$VERCEL_TOKEN"
VERCEL_PROJECT_ID="your-backend-project-id" vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"

VERCEL_PROJECT_ID="your-frontend-project-id" vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
API_BASE_URL="https://beli-for-vandy-backend.vercel.app" \
  VERCEL_PROJECT_ID="your-frontend-project-id" \
  vercel build --prod --token="$VERCEL_TOKEN"
VERCEL_PROJECT_ID="your-frontend-project-id" vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"
```

`vercel pull` stores project metadata under the ignored root `.vercel/` directory and may
create an ignored `.env.local` containing credentials. Copy `.env.example` to the ignored
root `.env`, then fill in these repository-level values; never commit or print them:

```dotenv
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_FRONTEND_PROJECT_ID=
VERCEL_BACKEND_PROJECT_ID=
STAGING_MONGODB_URI=
```

If Vercel Authentication protects a deployment, use `vercel curl <url>` for an
authenticated smoke test. The command uses `VERCEL_TOKEN` from the environment and
creates the required protection bypass without exposing it. Put ordinary curl flags after
the URL; Vercel CLI flags placed there are forwarded to curl.

## Continuous integration

The `CI` GitHub Actions workflow runs for every pull request targeting `main` and every
push to `main`. Its `Quality gate` executes these stages in order and stops at the first
failure:

1. Install dependencies from `backend/requirements*.txt` and `frontend/package-lock.json`.
2. Lint Python with Ruff and Angular/TypeScript with ESLint.
3. Type-check the frontend with `tsc --noEmit`.
4. Run backend and frontend unit tests as separately named steps.
5. Run FastAPI route/database integration tests with `mongomock-motor`.
6. Run the review API integration test against a disposable MongoDB service container.
7. Generate coverage reports, enforcing 65% backend coverage and the configured frontend thresholds.
8. Build the production Angular application.

The parallel `Security gate` runs Semgrep SAST, pip-audit, npm audit, and full-history
Gitleaks scanning. It fails on scanner errors and High or Critical findings; pip-audit
fails on any advisory because its CLI does not provide a severity threshold. See
[`docs/security/README.md`](docs/security/README.md) for severity mapping, reproduction
commands, the measured coverage gaps, and required status-check setup.

The backend test layers are currently divided as follows:

- Unit: user models, controller behavior, and account route behavior with a fake controller.
- Integration: review, location, and follow HTTP routes backed by asynchronous fake MongoDB,
  plus a review creation test that traverses the real FastAPI route and controller and then
  verifies the stored document in a disposable MongoDB database.

CI never contacts MongoDB Atlas or another paid service. Its real-database test uses an
isolated `beli_integration_test` database in a MongoDB service container that is discarded
with the job. Future external integrations must use fakes or stubs by default in tests.

Run the same checks locally:

```bash
backend/.venv/bin/ruff check backend
cd frontend && npm run lint && npm run typecheck && cd ..
backend/.venv/bin/python -m pytest \
  backend/tests/test_user_models.py \
  backend/tests/test_user_controller.py \
  backend/tests/test_account_api.py
cd frontend && npm run test:unit && cd ..
backend/.venv/bin/python -m pytest \
  backend/tests/test_reviews.py \
  backend/tests/test_locations.py \
  backend/tests/test_follows.py
REAL_MONGODB_URI=mongodb://localhost:27017/beli_integration_test \
  backend/.venv/bin/python -m pytest backend/tests/test_review_real_database.py
backend/.venv/bin/python -m pytest --cov=backend --cov-config=.coveragerc \
  --cov-report=term-missing --cov-fail-under=65
cd frontend && npm run test:coverage && npm run build
```

## Continuous delivery to staging

After both the quality and security gates pass on a push to `main`, GitHub Actions
automatically deploys the backend and frontend to two staging-only Vercel projects and
smoke-tests both generated deployment URLs. The Vercel projects use their production targets as the stable staging
environment; this repository does not automatically deploy the public production system.
The deploy commands run from the repository root because Vercel applies each project's
configured Root Directory.

Configure a GitHub environment named `staging` without required reviewers so delivery has
no manual step. Add these environment secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_BACKEND_PROJECT_ID`
- `VERCEL_FRONTEND_PROJECT_ID`
- `STAGING_MONGODB_URI`

Add these non-secret environment variables:

- `STAGING_API_URL`: stable URL of the staging backend Vercel project.
- `STAGING_WEB_URL`: stable URL of the staging frontend Vercel project.

The workflow passes the MongoDB URI and allowed frontend origin to the backend deployment
at runtime. Secret values remain in GitHub Actions and are never committed.

The staging Atlas URI must name the `beli_staging` database in its path. The backend selects
the database from `MONGODB_URI`, while a URI without a database path falls back to `beli_db`
for local development. The staging database uses the existing `users`, `locations`,
`reviews`, and `follows` collections and the application models documented in
`backend/routes/README.md`; do not create a separate staging schema.

### Administrator bootstrap

Set `BOOTSTRAP_ADMIN_IDENTIFIER` in the backend environment to the email address or
username of an already-created account before the first deployment. During startup, the
backend backfills missing role, status, and security-version fields, then promotes the
configured account only when no administrator exists. The setting is intentionally not a
password or a public registration field; remove it after the first administrator is
created. Subsequent role changes are administrator-only, require password re-entry, and
invalidate the changed account's existing bearer tokens.

## Main branch protection

The `main` ruleset must require pull requests, one approving review, and both the
`CI / Quality gate` and `CI / Security gate` status checks. A repository administrator
must add `CI / Security gate` to the required checks; this repository change does not
update GitHub settings. The ruleset must block direct and force pushes, apply to repository
administrators, and have no bypass actors. Beginning October 13, 2026, all Sprint 3 work
must reach `main` through this reviewed pull-request path.

For course evidence, retain the CI rollout pull request's failed run and its corrective
commit. The first run exposed genuine pre-existing frontend type/test failures; the follow-up
fix demonstrates the pipeline blocking the change before it became mergeable.


## Usability Testing

Usability testing was conducted with two student testers to evaluate how easily users could navigate the app and complete three common tasks: submitting a dining hall meal review, finding and following another user, and browsing friends' reviews to save a favorite dish.

### Testing Results

Both testers successfully completed all three tasks without assistance. Overall, users were able to navigate the app quickly and found the core features easy to use.

| Task | Tester A | Tester B | Target Time |
|---|---|---|---|
| T1: Submit a meal review | 30 seconds | 30 seconds | 3 minutes |
| T2: Find and follow another user | 1 minute | 30 seconds | 2 minutes |
| T3: Browse friends' reviews and favorite a dish | 30 seconds | 45 seconds | 4 minutes |

All tasks were completed within their target times. Testers also rated the usability of each task between 8 and 10 on a 10-point scale, indicating a positive overall user experience.

### User Feedback and Improvements

Although the testers completed every task successfully, they identified a few areas where the interface could be improved:

- **Following other users:** One tester suggested adding the ability to follow someone directly from their review. This would make connecting with other students more intuitive.
- **Discover page clarity:** Another tester was confused when users they had already followed appeared alongside people they had not yet discovered. The Discover page could better distinguish between existing friends and new users.
- **Favorite section visibility:** One tester suggested adding a border around the favorites section to make it stand out more clearly from regular reviews.

### Planned Improvements

Based on the feedback, we identified the following improvements:

| Improvement | Priority | GitHub Issue |
|---|---|---|
| Improve the ability to follow users directly from their reviews | Low Priority | #78 |
| Clarify the Discover page. | Low Priority | #79 |
| Add a visual border around the favorites section to make it easier to identify. | Low Priority | #80 |

### Conclusion

Overall, usability testing showed that the app's primary features are easy to understand and use. Both testers completed every task significantly faster than the expected completion times, with no major usability issues or points where users gave up. The feedback highlighted a few small interface improvements that could make navigation more intuitive and improve the visibility of important features. These changes will help create a smoother experience for students using the app to discover meals, share reviews, and connect with friends.
