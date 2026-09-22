# Beli for Vanderbilt API

The backend is a FastAPI service. When running locally with the default settings, its base URL is:

```text
http://localhost:8000
```

Interactive OpenAPI documentation is available at `/docs`, and the raw OpenAPI schema is available at `/openapi.json`.

## Authentication

Authentication uses an opaque session token stored in an `HttpOnly` cookie. A successful login sets the cookie; clients should include it on later requests. The token is never returned in a JSON response, and only its hash is stored in MongoDB.

The default cookie name is `beli_session`. It can be changed with `SESSION_COOKIE_NAME`.

## User representation

Successful authentication endpoints return a user object:

```json
{
  "id": "66f1c0d00e52a26712ad9340",
  "email": "person@example.com",
  "created_at": "2026-09-22T14:30:00Z"
}
```

Password hashes and session tokens are never included.

## Create an account

`POST /auth/signup`

Creates a user account. The email must be valid, and the password must contain at least three characters.

Request:

```json
{
  "email": "person@example.com",
  "password": "example-password"
}
```

Responses:

| Status | Meaning |
| --- | --- |
| `201 Created` | The account was created. Returns the user object. |
| `409 Conflict` | An account already uses that email address. |
| `422 Unprocessable Entity` | The email or password is invalid. |

Example:

```bash
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"person@example.com","password":"example-password"}'
```

## Log in

`POST /auth/login`

Authenticates a user and sets the session cookie.

Request:

```json
{
  "email": "person@example.com",
  "password": "example-password"
}
```

Responses:

| Status | Meaning |
| --- | --- |
| `200 OK` | Authentication succeeded. Returns the user object and sets the session cookie. |
| `401 Unauthorized` | The email or password is incorrect. |
| `422 Unprocessable Entity` | The request fields are invalid. |

Example that saves the cookie to `cookies.txt`:

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"person@example.com","password":"example-password"}'
```

## Get the current user

`GET /auth/me`

Returns the user associated with the session cookie.

Responses:

| Status | Meaning |
| --- | --- |
| `200 OK` | Returns the authenticated user object. |
| `401 Unauthorized` | The session cookie is missing, invalid, or expired. |

Example using the cookie saved during login:

```bash
curl http://localhost:8000/auth/me -b cookies.txt
```

## Health check

`GET /`

Confirms that the API application is running.

Response:

```json
{
  "message": "Beli for Vanderbilt API is up and running!"
}
```
