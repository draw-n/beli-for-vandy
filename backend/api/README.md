# Beli for Vanderbilt API

The backend is a FastAPI service. When running locally with the default settings, its base URL is `http://localhost:8000`. Interactive OpenAPI documentation is available at `/docs`, and the raw schema is available at `/openapi.json`.

The account API intentionally supports account creation and deletion only. It does not provide login, session, or current-user endpoints. Passwords are stored as Argon2 hashes and are never included in responses.

## Account representation

Successful account creation returns:

```json
{
  "id": "66f1c0d00e52a26712ad9340",
  "email": "person@example.com",
  "created_at": "2026-09-22T14:30:00Z"
}
```

## Create an account

`POST /accounts`

The email must be valid, and the password must contain at least three characters.

Request:

```json
{
  "email": "person@example.com",
  "password": "example-password"
}
```

| Status | Meaning |
| --- | --- |
| `201 Created` | The account was created. Returns the account representation. |
| `409 Conflict` | An account already uses that email address. |
| `422 Unprocessable Entity` | The email or password is invalid. |

```bash
curl -X POST http://localhost:8000/accounts \
  -H "Content-Type: application/json" \
  -d '{"email":"person@example.com","password":"example-password"}'
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

## Health check

`GET /`

Returns `200 OK` while the API is running:

```json
{
  "message": "Beli for Vanderbilt API is up and running!"
}
```
