# Project Guidance

## Purpose and architecture

Beli for Vanderbilt helps Vanderbilt students, faculty, and staff discover dining halls and meals through friends' ratings and reviews. The frontend is an Angular and TypeScript application that provides the user interface. The backend is a Python FastAPI service backed by MongoDB Atlas, with asynchronous database access through Motor. Keep presentation logic in Angular, API and business logic in FastAPI, and persistence concerns in the backend database layer.

## Development workflow

- Before pushing any commits, verify that you are working on a branch rather than the default branch.
- Add and commit every notable feature included in a plan.

## Architectural patterns

- Preserve the frontend/backend separation described above.
- Keep MongoDB access isolated in the backend database layer and use asynchronous operations.
- Keep secrets and environment-specific configuration in ignored `.env` files; document only safe placeholders in `.env.example`.
- If a new architectural pattern is introduced, explicitly document it in this section.
