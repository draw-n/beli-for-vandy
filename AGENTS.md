# Project Guidance

## Purpose and architecture

Beli for Vanderbilt helps Vanderbilt students, faculty, and staff discover dining halls and meals through friends' ratings and reviews. The frontend is an Angular and TypeScript application that provides the user interface. The backend is a Python FastAPI service backed by MongoDB Atlas, with asynchronous database access through Motor. Keep presentation logic in Angular, API and business logic in FastAPI, and persistence concerns in the backend database layer.

## Development workflow

- Document any new/modified APIs
- Before pushing any commits, verify that you are working on a branch rather than the default branch.
- Add and commit every notable feature included in a plan.
- Prefer using MCPs and CLIs before Computer User/Control

## Architectural patterns

- Preserve the frontend/backend separation described above.
- Keep MongoDB access isolated in the backend database layer and use asynchronous operations.
- Store review photo bytes in MongoDB GridFS through the backend photo storage controller; keep only photo IDs in review documents. Do not expose photo upload or retrieval routes until requests can be authenticated server-side.
- Select the MongoDB database from the database name in `MONGODB_URI`; use `beli_db` only as the local-development fallback and `beli_staging` for staging.
- Structure the backend into model, controller, and API layers: models define application data, controllers coordinate application logic and persistence, and API modules define HTTP endpoints.
- Deploy the Angular frontend and FastAPI backend as separate Vercel projects. Treat the Vercel CLI as repository-wide tooling rather than a frontend dependency.
- Configure the Vercel project roots as `frontend` and `backend`, then run Vercel CLI build and deployment commands from the repository root so the configured roots are applied exactly once.
- Build the Angular application in static output mode for Vercel; pages that load API data at runtime use client rendering, while data-independent pages may be prerendered.
- Support account creation and password-verified deletion only; do not add login or session functionality unless explicitly requested.
- Keep secrets and environment-specific configuration in ignored `.env` files; document only safe placeholders in `.env.example`.
- If a new architectural pattern is introduced, explicitly document it in this section.

## Style guide

- Keep custom CSS rules minimal, until a style guide is implemented here.
