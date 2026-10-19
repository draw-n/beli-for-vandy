# Beli for Vanderbilt API

The backend is a FastAPI service. When running locally with the default settings, its base URL is `http://localhost:8000`. Interactive OpenAPI documentation is available at `/docs`, and the raw schema is available at `/openapi.json`.

Deployment configuration is read from environment variables. `MONGODB_URI` selects the
database and `CORS_ORIGINS` is a JSON array of allowed frontend origins, for example
`["https://staging.example.com"]`. Safe local placeholders are documented in
`backend/.env.example`; secrets must be supplied by the deployment environment.

`AUTH_TOKEN_SECRET` is required to issue or verify access tokens. Set a strong random secret in the ignored `backend/.env` and in the deployment environment. The API does not provide refresh tokens or server-side sessions. The reusable bearer-token dependency is available for routes that require authentication. Existing review text operations remain compatible without a token; photo-reference changes require authentication as described below.

User records are stored in the MongoDB `users` collection. Passwords are stored as Argon2 hashes and are never included in responses.

## List reviews

`GET /reviews/` returns reviews and accepts optional `location_id` and `user_id` query parameters. When supplied together, both filters apply.

Review creation and updates accept an optional `favorite_dishes` array of strings.
Omitting it on creation stores an empty array; updates that omit it preserve the
current list. Review responses include `favorite_dishes`.

## Favorite dishes

Favorite dishes are a private per-account collection. All endpoints require a
valid bearer token and scope reads, additions, and removals to the token owner.
`GET /favorite-dishes/` lists saved dishes, `POST /favorite-dishes/` accepts
`{"name":"Mac and cheese","location_id":"...","location_name":"Commons"}`, and
`DELETE /favorite-dishes/{dish_id}` removes one. Dish names are whitespace-normalized
and case-insensitive for duplicate detection within a dining hall.

## Review photo references

`POST /reviews/` continues to accept text-only reviews without a bearer token.
When `photo_ids` is nonempty, the request must include a valid bearer token, and
the token account UUID must match the review's `user_id`. Each photo must exist,
belong to that account, be unique in the request, and not be referenced by another
review. A review can include at most three photos.

`PUT /reviews/{review_id}` preserves existing photos when `photo_ids` is omitted.
If the field is supplied—including as `[]` or `null`—the request must include a
valid bearer token for the review owner. A supplied list replaces the current list;
`[]` and `null` clear it. New IDs are subject to the same existence, ownership,
uniqueness, and three-photo checks. Photos already attached to this same review
may remain in its replacement list.

Unauthenticated text-only review creation and editing remain existing security
limitations. Review deletion also remains unauthenticated. These checks secure
photo-reference changes only; they do not make all review operations fully
authorized or independently establish authorship for text-only reviews.

## Account representation

Successful account creation returns:

```json
{
  "username": "commodore",
  "first_name": "Cornelius",
  "last_name": "Vanderbilt",
  "email": "person@example.com",
  "uuid": "d08f600f-d60e-49b1-b762-f05f42935796",
  "year_graduation": 2027,
  "type": "student",
  "created_at": "2026-09-22T14:30:00Z",
  "home_city": "Nashville"
}
```

## Stored user document

MongoDB stores each record in the `users` collection with these application fields:

```json
{
  "username": "commodore",
  "first_name": "Cornelius",
  "last_name": "Vanderbilt",
  "email": "person@example.com",
  "password_hash": "<argon2-hash>",
  "uuid": "d08f600f-d60e-49b1-b762-f05f42935796",
  "year_graduation": 2027,
  "type": "student",
  "created_at": "2026-09-22T14:30:00Z",
  "home_city": "Nashville"
}
```

MongoDB also supplies its internal `_id`. The API never stores the plaintext password or returns `password_hash`.

## Create an account

`POST /accounts`

The username, first name, last name, email, password, type, and home city are required. The email must be valid, the password must contain at least three characters, and `type` must be `student` or `faculty`. `year_graduation` is optional. The server generates `uuid` and `created_at`.

Request:

```json
{
  "username": "commodore",
  "first_name": "Cornelius",
  "last_name": "Vanderbilt",
  "email": "person@example.com",
  "password": "example-password",
  "year_graduation": 2027,
  "type": "student",
  "home_city": "Nashville"
}
```

| Status | Meaning |
| --- | --- |
| `201 Created` | The account was created. Returns the account representation. |
| `409 Conflict` | An account already uses that username or email address. |
| `422 Unprocessable Entity` | One or more request fields are invalid. |

```bash
curl -X POST http://localhost:8000/accounts \
  -H "Content-Type: application/json" \
  -d '{"username":"commodore","first_name":"Cornelius","last_name":"Vanderbilt","email":"person@example.com","password":"example-password","year_graduation":2027,"type":"student","home_city":"Nashville"}'
```

## Delete an account

`DELETE /accounts`

Permanently deletes the account after verifying its email and password. The error response is deliberately identical for an unknown email and an incorrect password.

Request:

```json
{
  "email": "person@example.com",
  "password": "example-password"
}
```

| Status | Meaning |
| --- | --- |
| `204 No Content` | The account was deleted. |
| `401 Unauthorized` | The email or password is incorrect. |
| `422 Unprocessable Entity` | The request fields are invalid. |

```bash
curl -X DELETE http://localhost:8000/accounts \
  -H "Content-Type: application/json" \
  -d '{"email":"person@example.com","password":"example-password"}'
```

## Log in

`POST /accounts/login` verifies the username and password and returns the existing
public account fields plus a signed bearer token. The token contains the account UUID
and expires 15 minutes after issuance. The response adds `access_token`, `token_type`
(`bearer`), and `expires_at`; all existing account fields keep their current names.

If `AUTH_TOKEN_SECRET` is missing or blank, successful credential verification returns
`503 Service Unavailable` without issuing a token. Invalid credentials continue to
return `401 Unauthorized`.

```bash
curl -X POST http://localhost:8000/accounts/login \
  -H "Content-Type: application/json" \
  -d '{"username":"commodore","password":"example-password"}'
```

## Health check

`GET /`

Returns `200 OK` while the API is running:

```json
{
  "message": "Beli for Vanderbilt API is up and running!"
}
```

## Photos

`POST /photos/` accepts one JPEG, PNG, or WebP file as multipart form field `file`.
It requires `Authorization: Bearer <access_token>` and stores the authenticated
account UUID as GridFS owner metadata. Uploads remain private and pending until a
saved review references their photo ID. Existing image processing applies the 5 MB
upload limit, decoded-pixel limit, resizing, metadata removal, and optimization.
The response is `{"uuid":"<photo-id>"}`. GridFS retains the photo ID, owner UUID,
and upload timestamp for future reference.

`GET /photos/{photo_id}` is public only when a saved review contains that photo ID
and its `user_id` matches the GridFS photo owner. Missing, unreferenced, or
owner-mismatched photos return `404`; pending uploads stay private until referenced
by a saved review.

Admin roles and photo moderation are planned as a separate future feature. This
implementation has no admin workflow or approval gate; a photo becomes retrievable
when it is securely attached to a saved review.

## Manual orphan-photo cleanup

Run `python scripts/cleanup_orphan_photos.py` from `backend/` for a dry run. The
script reports the configured database and eligible candidate count. It never
deletes by default. Actual deletion requires both `--delete` and
`--confirm-database <exact-database-name>`; `--grace-hours` defaults to 24.
Candidates must be unreferenced by every saved review, have valid owner/status and
age metadata, and be past the grace period. Detached photos age from
`unreferenced_since`; never-attached uploads age from `uploaded_at`. Unknown states
and future moderation states are skipped. Each file is atomically claimed and its
review references are checked again immediately before GridFS deletion.

Review photo-reference changes use the same per-file claim. If a process crashes
while holding a claim, cleanup skips that file indefinitely; inspect and recover
such metadata manually rather than expiring claims automatically. Cleanup is not
scheduled or run on API startup. Never provide deletion confirmation for a shared
Atlas database without explicit operational approval.

**Authorization limitation:** photo-bearing review creation and photo-reference
updates now check the bearer identity, review ownership, and photo ownership.
Unauthenticated text-only review creation and editing still accept client-provided
`user_id` values, and review deletion remains unauthenticated. These existing
limitations mean review authorship and all review operations are not fully
authorized. Photo deletion and orphan cleanup are not implemented yet.

### Test through Swagger

1. Open `http://localhost:8000/docs` and use `POST /accounts/login` with a valid
   account to obtain `access_token`.
2. Click **Authorize**, paste the `access_token` value into the bearer field, and
   authorize the session (Swagger adds the `Bearer` prefix).
3. Open `POST /photos/`, choose a JPEG, PNG, or WebP file in the `file` field, and
   execute. A successful response is `201` with a `uuid`.
4. A pending upload intentionally returns `404` from `GET /photos/{photo_id}`.
   To verify public retrieval, create a review through `POST /reviews/` with the
   matching account UUID in `user_id`, the photo ID in `photo_ids`, and the same
   bearer token. Then use GET to retrieve the photo. Photo-bearing review requests
   validate ownership; unauthenticated text-only review requests and review deletion
   retain the authorization limitations described above.
