# Beli for Vanderbilt API

The backend is a FastAPI service. When running locally with the default settings, its base URL is `http://localhost:8000`. Interactive OpenAPI documentation is available at `/docs`, and the raw schema is available at `/openapi.json`.

Deployment configuration is read from environment variables. `MONGODB_URI` selects the
database and `CORS_ORIGINS` is a JSON array of allowed frontend origins, for example
`["https://staging.example.com"]`. Safe local placeholders are documented in
`backend/.env.example`; secrets must be supplied by the deployment environment.

The account API intentionally supports account creation and deletion only. It does not provide login, session, or current-user endpoints. User records are stored in the MongoDB `users` collection. Passwords are stored as Argon2 hashes and are never included in responses.

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

## Health check

`GET /`

Returns `200 OK` while the API is running:

```json
{
  "message": "Beli for Vanderbilt API is up and running!"
}
```
