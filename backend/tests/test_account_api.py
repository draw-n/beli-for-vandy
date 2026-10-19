import unittest
from datetime import datetime, timedelta, timezone
import os
from unittest.mock import patch

import jwt
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

import database
from controllers.auth import get_current_user, get_current_user_id
from routes.user import get_user_controller, router
from controllers.user import InvalidCredentialsError, UserAlreadyExistsError
from models.user import AccountStatus, StoredUser, UserCreate, UserRole, UserType
from settings import Settings, get_settings


TEST_TOKEN_SECRET = "test-only-signing-secret-with-sufficient-entropy"


class FakeUserController:
    def __init__(self) -> None:
        self.deleted_credentials: tuple[str, str] | None = None
        self.users = [
            StoredUser(
                username="commodore",
                first_name="Cornelius",
                last_name="Vanderbilt",
                email="person@example.com",
                password_hash="unused",
                uuid="d08f600f-d60e-49b1-b762-f05f42935796",
                year_graduation=2027,
                type=UserType.STUDENT,
                created_at=datetime.now(timezone.utc),
                home_city="Nashville",
                role=UserRole.ADMIN,
                status=AccountStatus.ACTIVE,
                security_version=0,
            )
        ]
        self.accounts: list[tuple[str, str]] = []

    async def create_user(self, payload: UserCreate) -> StoredUser:
        identity = (payload.username, str(payload.email).lower())
        if any(username == identity[0] or email == identity[1] for username, email in self.accounts):
            raise UserAlreadyExistsError
        self.accounts.append(identity)
        return StoredUser(
            username=payload.username,
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=str(payload.email).lower(),
            password_hash=f"hashed-{payload.password}",
            uuid="d08f600f-d60e-49b1-b762-f05f42935796",
            year_graduation=payload.year_graduation,
            type=payload.type,
            created_at=datetime.now(timezone.utc),
            home_city=payload.home_city,
            role=UserRole.USER,
            status=AccountStatus.ACTIVE,
            security_version=0,
        )

    async def delete_user(self, user_uuid: str, email: str, password: str) -> None:
        if email != "person@example.com" or password != "abc":
            raise InvalidCredentialsError
        self.deleted_credentials = (email, password)

    async def authenticate_user(self, username: str, password: str) -> StoredUser:
        if username != "commodore" or password != "abc":
            raise InvalidCredentialsError

        return StoredUser(
            username="commodore",
            first_name="Cornelius",
            last_name="Vanderbilt",
            email="person@example.com",
            password_hash="unused",
            uuid="d08f600f-d60e-49b1-b762-f05f42935796",
            year_graduation=2027,
            type=UserType.STUDENT,
            created_at=datetime.now(timezone.utc),
            home_city="Nashville",
            role=UserRole.ADMIN,
            status=AccountStatus.ACTIVE,
            security_version=0,
        )

    async def get_users(self) -> list[StoredUser]:
        return self.users

    async def find_one(self, query: dict[str, str]) -> dict[str, object] | None:
        user = next(
            (user for user in self.users if user.uuid == query.get("uuid")),
            None,
        )
        return user.model_dump(mode="python") if user is not None else None


class AccountApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.original_token_secret = os.environ.get("AUTH_TOKEN_SECRET")
        os.environ["AUTH_TOKEN_SECRET"] = TEST_TOKEN_SECRET
        get_settings.cache_clear()
        app = FastAPI()
        app.include_router(router)
        app.get("/test-auth")(self.protected_endpoint)
        self.controller = FakeUserController()
        app.dependency_overrides[get_user_controller] = lambda: self.controller
        app.dependency_overrides[get_current_user] = lambda: self.controller.users[0]
        self.original_users_collection = database.users_collection
        database.users_collection = self.controller  # type: ignore[assignment]
        self.client = TestClient(app)

    def tearDown(self) -> None:
        if self.original_token_secret is None:
            os.environ.pop("AUTH_TOKEN_SECRET", None)
        else:
            os.environ["AUTH_TOKEN_SECRET"] = self.original_token_secret
        database.users_collection = self.original_users_collection
        get_settings.cache_clear()

    @staticmethod
    def protected_endpoint(user_id: str = Depends(get_current_user_id)) -> dict[str, str]:
        return {"user_id": user_id}

    def test_user_can_create_an_account(self) -> None:
        response = self.client.post(
            "/accounts",
            json={
                "username": "commodore",
                "first_name": "Cornelius",
                "last_name": "Vanderbilt",
                "email": "person@example.com",
                "password": "abc",
                "year_graduation": 2027,
                "type": "student",
                "home_city": "Nashville",
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.json(),
            {
                "username": "commodore",
                "first_name": "Cornelius",
                "last_name": "Vanderbilt",
                "email": "person@example.com",
                "uuid": "d08f600f-d60e-49b1-b762-f05f42935796",
                "year_graduation": 2027,
                "type": UserType.STUDENT.value,
                "created_at": response.json()["created_at"],
                "home_city": "Nashville",
                "role": UserRole.USER.value,
                "status": AccountStatus.ACTIVE.value,
            },
        )

    def test_administrator_can_load_accounts(self) -> None:
        response = self.client.get("/accounts")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["uuid"], "d08f600f-d60e-49b1-b762-f05f42935796")
        self.assertNotIn("password_hash", response.json()[0])

    def test_anyone_can_load_public_account_names(self) -> None:
        response = self.client.get("/accounts/public")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [{
                "uuid": "d08f600f-d60e-49b1-b762-f05f42935796",
                "first_name": "Cornelius",
                "last_name": "Vanderbilt",
            }],
        )

    def test_regular_user_cannot_load_accounts(self) -> None:
        regular_user = self.controller.users[0].model_copy(update={"role": UserRole.USER})
        self.client.app.dependency_overrides[get_current_user] = lambda: regular_user

        response = self.client.get("/accounts")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json(), {"detail": "Administrator access required"})

    def test_graduation_year_is_optional_and_user_type_is_constrained(self) -> None:
        payload = {
            "username": "professor",
            "first_name": "John",
            "last_name": "Doe",
            "email": "professor@example.com",
            "password": "abc",
            "type": "faculty",
            "home_city": "Nashville",
        }

        response = self.client.post("/accounts", json=payload)
        invalid_response = self.client.post(
            "/accounts",
            json={**payload, "type": "alumni"},
        )

        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.json()["year_graduation"])
        self.assertEqual(response.json()["type"], "faculty")
        self.assertEqual(invalid_response.status_code, 422)

    def test_registration_rejects_duplicate_username_and_email(self) -> None:
        payload = {
            "username": "commodore",
            "first_name": "Cornelius",
            "last_name": "Vanderbilt",
            "email": "person@example.com",
            "password": "abc",
            "type": "student",
            "home_city": "Nashville",
        }
        self.assertEqual(self.client.post("/accounts", json=payload).status_code, 201)

        duplicate_username = self.client.post(
            "/accounts", json={**payload, "email": "another@example.com"}
        )
        duplicate_email = self.client.post(
            "/accounts", json={**payload, "username": "another-user"}
        )

        self.assertEqual(duplicate_username.status_code, 409)
        self.assertEqual(duplicate_email.status_code, 409)

    def test_registration_rejects_invalid_fields_and_password_below_minimum(self) -> None:
        payload = {
            "username": "commodore",
            "first_name": "Cornelius",
            "last_name": "Vanderbilt",
            "email": "person@example.com",
            "password": "abc",
            "type": "student",
            "home_city": "Nashville",
        }
        invalid_payloads = (
            {**payload, "password": "ab"},
            {**payload, "email": "not-an-email"},
            {**payload, "username": "   "},
            {key: value for key, value in payload.items() if key != "username"},
        )

        for invalid in invalid_payloads:
            with self.subTest(invalid=invalid):
                self.assertEqual(self.client.post("/accounts", json=invalid).status_code, 422)

    def test_user_can_delete_an_account_with_valid_credentials(self) -> None:
        response = self.client.request(
            "DELETE",
            "/accounts",
            json={"email": "person@example.com", "password": "abc"},
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b"")
        self.assertEqual(
            self.controller.deleted_credentials,
            ("person@example.com", "abc"),
        )

    def test_account_deletion_rejects_invalid_credentials(self) -> None:
        response = self.client.request(
            "DELETE",
            "/accounts",
            json={"email": "person@example.com", "password": "wrong"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "Invalid email or password"})

    def test_account_deletion_validates_its_request_fields(self) -> None:
        response = self.client.request(
            "DELETE",
            "/accounts",
            json={"email": "not-an-email", "password": ""},
        )

        self.assertEqual(response.status_code, 422)
        self.assertIsNone(self.controller.deleted_credentials)

    def test_user_can_log_in_with_valid_credentials(self) -> None:
        response = self.client.post(
            "/accounts/login",
            json={"username": "commodore", "password": "abc"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "commodore")
        self.assertNotIn("password_hash", response.json())
        for field in (
            "first_name",
            "last_name",
            "email",
            "uuid",
            "year_graduation",
            "type",
            "created_at",
            "home_city",
            "role",
            "status",
        ):
            self.assertIn(field, response.json())
        self.assertEqual(response.json()["role"], UserRole.ADMIN.value)
        self.assertEqual(response.json()["status"], AccountStatus.ACTIVE.value)
        self.assertEqual(response.json()["token_type"], "bearer")

        claims = jwt.decode(
            response.json()["access_token"],
            TEST_TOKEN_SECRET,
            algorithms=["HS256"],
        )
        self.assertEqual(claims["sub"], "d08f600f-d60e-49b1-b762-f05f42935796")
        self.assertIn("iat", claims)
        self.assertIn("exp", claims)
        self.assertEqual(claims["security_version"], 0)
        self.assertEqual(claims["exp"] - claims["iat"], 15 * 60)
        self.assertEqual(
            int(datetime.fromisoformat(response.json()["expires_at"]).timestamp()),
            claims["exp"],
        )

        authenticated = self.client.get(
            "/test-auth",
            headers={"Authorization": f"Bearer {response.json()['access_token']}"},
        )
        self.assertEqual(authenticated.status_code, 200)
        self.assertEqual(
            authenticated.json(),
            {"user_id": "d08f600f-d60e-49b1-b762-f05f42935796"},
        )

    def test_login_rejects_invalid_credentials(self) -> None:
        response = self.client.post(
            "/accounts/login",
            json={"username": "commodore", "password": "wrong"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "Invalid username or password"})
        self.assertNotIn("access_token", response.json())

    def test_login_rejects_empty_or_whitespace_required_fields(self) -> None:
        for payload in (
            {"username": "", "password": "abc"},
            {"username": "   ", "password": "abc"},
            {"username": "commodore", "password": ""},
            {"username": "commodore"},
        ):
            with self.subTest(payload=payload):
                self.assertEqual(self.client.post("/accounts/login", json=payload).status_code, 422)

    def test_authentication_rejects_expired_tokens(self) -> None:
        expired = jwt.encode(
            {
                "sub": "user-123",
                "iat": int(datetime.now(timezone.utc).timestamp()) - 120,
                "exp": int(datetime.now(timezone.utc).timestamp()) - 60,
            },
            TEST_TOKEN_SECRET,
            algorithm="HS256",
        )

        response = self.client.get(
            "/test-auth", headers={"Authorization": f"Bearer {expired}"}
        )

        self.assertEqual(response.status_code, 401)

    def test_jwt_expiration_boundary_is_valid_before_and_invalid_at_or_after(self) -> None:
        expires_at = datetime(2026, 10, 18, 12, 0, tzinfo=timezone.utc)
        token = jwt.encode(
            {
                "sub": "user-123",
                "iat": int((expires_at - timedelta(minutes=1)).timestamp()),
                "exp": int(expires_at.timestamp()),
            },
            TEST_TOKEN_SECRET,
            algorithm="HS256",
        )

        class FrozenDateTime(datetime):
            current = expires_at

            @classmethod
            def now(cls, tz=None):
                return cls.current if tz else cls.current.replace(tzinfo=None)

        results = []
        for offset in (-1, 0, 1):
            FrozenDateTime.current = expires_at + timedelta(seconds=offset)
            with patch("jwt.api_jwt.datetime", FrozenDateTime):
                results.append(
                    self.client.get(
                        "/test-auth", headers={"Authorization": f"Bearer {token}"}
                    ).status_code
                )

        self.assertEqual(results, [200, 401, 401])

    def test_authentication_rejects_tampered_tokens(self) -> None:
        login = self.client.post(
            "/accounts/login",
            json={"username": "commodore", "password": "abc"},
        )
        header, payload, signature = login.json()["access_token"].split(".")
        replacement = "A" if signature[0] != "A" else "B"
        tampered = f"{header}.{payload}.{replacement}{signature[1:]}"

        response = self.client.get(
            "/test-auth", headers={"Authorization": f"Bearer {tampered}"}
        )

        self.assertEqual(response.status_code, 401)

    def test_authentication_rejects_missing_bearer_tokens_and_mock_cookie(self) -> None:
        self.client.cookies.set("mockAuth", "d08f600f-d60e-49b1-b762-f05f42935796")
        response = self.client.get("/test-auth")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["www-authenticate"], "Bearer")

    def test_login_fails_safely_when_signing_secret_is_missing(self) -> None:
        from controllers import auth

        with patch.object(
            auth,
            "get_settings",
            return_value=Settings(auth_token_secret=None, _env_file=None),
        ):
            response = self.client.post(
                "/accounts/login",
                json={"username": "commodore", "password": "abc"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"detail": "Authentication is not configured"})


if __name__ == "__main__":
    unittest.main()
