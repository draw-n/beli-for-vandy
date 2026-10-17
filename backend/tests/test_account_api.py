import unittest
from datetime import datetime, timezone
import os
from unittest.mock import patch

import jwt
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from controllers.auth import get_current_user_id
from routes.user import get_user_controller, router
from controllers.user import InvalidCredentialsError
from models.user import StoredUser, UserCreate, UserType
from settings import Settings, get_settings


TEST_TOKEN_SECRET = "test-only-signing-secret-with-sufficient-entropy"


class FakeUserController:
    def __init__(self) -> None:
        self.deleted_credentials: tuple[str, str] | None = None

    async def create_user(self, payload: UserCreate) -> StoredUser:
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
        )

    async def delete_user(self, email: str, password: str) -> None:
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
        )


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
        self.client = TestClient(app)

    def tearDown(self) -> None:
        if self.original_token_secret is None:
            os.environ.pop("AUTH_TOKEN_SECRET", None)
        else:
            os.environ["AUTH_TOKEN_SECRET"] = self.original_token_secret
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
            },
        )

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
        ):
            self.assertIn(field, response.json())
        self.assertEqual(response.json()["token_type"], "bearer")

        claims = jwt.decode(
            response.json()["access_token"],
            TEST_TOKEN_SECRET,
            algorithms=["HS256"],
        )
        self.assertEqual(claims["sub"], "d08f600f-d60e-49b1-b762-f05f42935796")
        self.assertIn("iat", claims)
        self.assertIn("exp", claims)
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
