import unittest
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.dependencies import get_auth_service
from auth.repository import Account, AccountAlreadyExistsError
from auth.router import router
from auth.service import AuthService
from settings import Settings, get_settings


class FakeAccountRepository:
    def __init__(self) -> None:
        self.accounts_by_email: dict[str, Account] = {}
        self.accounts_by_id: dict[str, Account] = {}
        self.account_ids_by_session_hash: dict[str, str] = {}

    async def create_account(self, email: str, password_hash: str) -> Account:
        if email in self.accounts_by_email:
            raise AccountAlreadyExistsError

        account = Account(
            id=str(len(self.accounts_by_id) + 1),
            email=email,
            password_hash=password_hash,
            created_at=datetime.now(timezone.utc),
        )
        self.accounts_by_email[email] = account
        self.accounts_by_id[account.id] = account
        return account

    async def find_account_by_email(self, email: str) -> Account | None:
        return self.accounts_by_email.get(email)

    async def create_session(
        self,
        account_id: str,
        token_hash: str,
        expires_at: datetime,
    ) -> None:
        self.account_ids_by_session_hash[token_hash] = account_id

    async def find_account_by_session_hash(self, token_hash: str) -> Account | None:
        account_id = self.account_ids_by_session_hash.get(token_hash)
        return self.accounts_by_id.get(account_id) if account_id else None


class AuthApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FakeAccountRepository()
        self.settings = Settings(
            _env_file=None,
            mongodb_uri="mongodb://localhost:27017",
            session_cookie_name="test_session",
            session_ttl_hours=1,
            session_cookie_secure=False,
        )
        self.service = AuthService(self.repository, self.settings.session_ttl_seconds)

        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_auth_service] = lambda: self.service
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
            self.repository.accounts_by_email["person@example.com"].password_hash,
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
