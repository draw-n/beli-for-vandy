# Project Guidance

## Purpose and architecture

Beli for Vanderbilt helps Vanderbilt students, faculty, and staff discover dining halls and meals through friends' ratings and reviews. The frontend is an Angular and TypeScript application that provides the user interface. The backend is a Python FastAPI service backed by MongoDB Atlas, with asynchronous database access through Motor. Keep presentation logic in Angular, API and business logic in FastAPI, and persistence concerns in the backend database layer.

## Development workflow

- Document any new/modified APIs
- Before pushing any commits, verify that you are working on a branch rather than the default branch.
- Add and commit every notable feature included in a plan.

## Architectural patterns

- Preserve the frontend/backend separation described above.
- Keep MongoDB access isolated in the backend database layer and use asynchronous operations.
- Structure the backend into model, controller, and API layers: models define application data, controllers coordinate application logic and persistence, and API modules define HTTP endpoints.
- Support account creation and password-verified deletion only; do not add login or session functionality unless explicitly requested.
- Keep secrets and environment-specific configuration in ignored `.env` files; document only safe placeholders in `.env.example`.
- If a new architectural pattern is introduced, explicitly document it in this section.

## Style guide

- Keep custom CSS rules minimal, until a style guide is implemented here.
