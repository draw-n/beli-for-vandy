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
- Write own reviews on dining halls and filter by breakfast, lunch, and dinner

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
npm install --global vercel@latest
vercel --version
vercel login
```

Link each application to its corresponding Vercel project:

```bash
vercel link --cwd frontend --project beli-for-vandy-frontend --yes
vercel link --cwd backend --project beli-for-vandy-backend --yes
```

The link commands store project metadata under ignored `.vercel/` directories and may
create ignored `.env.local` files containing short-lived credentials. Keep the following
repository-level values in the ignored root `.env`; never commit or print their values:

```dotenv
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_FRONTEND_PROJECT_ID=
VERCEL_BACKEND_PROJECT_ID=
STAGING_MONGODB_URI=
```

## Continuous integration

The `CI` GitHub Actions workflow runs for every pull request targeting `main` and every
push to `main`. Its `Quality gate` executes these stages in order and stops at the first
failure:

1. Install dependencies from `backend/requirements*.txt` and `frontend/package-lock.json`.
2. Lint Python with Ruff and Angular/TypeScript with ESLint.
3. Type-check the frontend with `tsc --noEmit`.
4. Run backend and frontend unit tests as separately named steps.
5. Run FastAPI route/database integration tests with `mongomock-motor`.
6. Generate backend and frontend coverage reports and enforce a 50% gate.
7. Build the production Angular application.

The backend test layers are currently divided as follows:

- Unit: user models, controller behavior, and account route behavior with a fake controller.
- Integration: review, location, and follow HTTP routes backed by asynchronous fake MongoDB.

CI never contacts MongoDB Atlas or another paid service. Future external integrations must
use fakes or stubs by default in tests.

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
backend/.venv/bin/python -m pytest --cov=backend --cov-config=.coveragerc \
  --cov-report=term-missing --cov-fail-under=50
cd frontend && npm run test:coverage && npm run build
```

## Continuous delivery to staging

After the quality gate passes on a push to `main`, GitHub Actions automatically deploys
the backend and frontend to two staging-only Vercel projects and smoke-tests both generated
deployment URLs. The Vercel projects use their production targets as the stable staging
environment; this repository does not automatically deploy the public production system.

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

## Main branch protection

The `main` ruleset must require pull requests, one approving review, and the
`CI / Quality gate` status check. It must block direct and force pushes, apply to repository
administrators, and have no bypass actors. Beginning October 13, 2026, all Sprint 3 work
must reach `main` through this reviewed pull-request path.

For course evidence, retain the CI rollout pull request's failed run and its corrective
commit. The first run exposed genuine pre-existing frontend type/test failures; the follow-up
fix demonstrates the pipeline blocking the change before it became mergeable.
