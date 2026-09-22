import unittest
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from controllers.security import hash_password, verify_password
from controllers.user import (
    AuthenticatedSession,
    InvalidCredentialsError,
    UserAlreadyExistsError,
)
from models.user import User
from routes.user import get_user_controller, router
from settings import Settings, get_settings


class FakeUserController:
    def __init__(self) -> None:
        self.users_by_email: dict[str, User] = {}
        self.users_by_session: dict[str, User] = {}

    async def create_user(self, email: str, password: str) -> User:
        email = email.strip().lower()
        if email in self.users_by_email:
            raise UserAlreadyExistsError

        user = User(
            id=str(len(self.users_by_email) + 1),
            email=email,
            password_hash=hash_password(password),
            created_at=datetime.now(timezone.utc),
        )
        self.users_by_email[email] = user
        return user

    async def login(self, email: str, password: str) -> AuthenticatedSession:
        user = self.users_by_email.get(email.strip().lower())
        if user is None or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError

        token = f"session-{user.id}"
        self.users_by_session[token] = user
        return AuthenticatedSession(user=user, token=token)

    async def get_user_for_session(self, token: str) -> User | None:
        return self.users_by_session.get(token)


class AuthApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.controller = FakeUserController()
        self.settings = Settings(
            _env_file=None,
            mongodb_uri="mongodb://localhost:27017",
            session_cookie_name="test_session",
            session_ttl_hours=1,
            session_cookie_secure=False,
        )
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_user_controller] = lambda: self.controller
        app.dependency_overrides[get_settings] = lambda: self.settings
        self.client = TestClient(app)

    def test_signup_normalizes_email_and_rejects_duplicates(self) -> None:
        response = self.client.post(
            "/auth/signup",
            json={"email": "Person@Example.com", "password": "abc"},
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["email"], "person@example.com")
        self.assertNotIn("password", response.json())
        self.assertNotEqual(
            self.controller.users_by_email["person@example.com"].password_hash,
            "abc",
        )

        duplicate = self.client.post(
            "/auth/signup",
            json={"email": "person@example.com", "password": "abc"},
        )
        self.assertEqual(duplicate.status_code, 409)

    def test_signup_requires_three_password_characters(self) -> None:
        response = self.client.post(
            "/auth/signup",
            json={"email": "person@example.com", "password": "ab"},
        )

        self.assertEqual(response.status_code, 422)

    def test_login_sets_session_cookie_and_authenticates_me(self) -> None:
        self.client.post(
            "/auth/signup",
            json={"email": "person@example.com", "password": "abc"},
        )

        login = self.client.post(
            "/auth/login",
            json={"email": "person@example.com", "password": "abc"},
        )

        self.assertEqual(login.status_code, 200)
        self.assertIn("test_session", self.client.cookies)
        set_cookie = login.headers["set-cookie"].lower()
        self.assertIn("httponly", set_cookie)
        self.assertIn("samesite=lax", set_cookie)

        current_account = self.client.get("/auth/me")
        self.assertEqual(current_account.status_code, 200)
        self.assertEqual(current_account.json()["email"], "person@example.com")

    def test_login_uses_a_generic_invalid_credentials_error(self) -> None:
        response = self.client.post(
            "/auth/login",
            json={"email": "missing@example.com", "password": "wrong"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "Invalid email or password"})

    def test_me_requires_a_session(self) -> None:
        response = self.client.get("/auth/me")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "Not authenticated"})


if __name__ == "__main__":
    unittest.main()
