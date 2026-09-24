import unittest
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.user import get_user_controller, router
from controllers.user import InvalidCredentialsError
from models.user import User


class FakeUserController:
    def __init__(self) -> None:
        self.deleted_credentials: tuple[str, str] | None = None

    async def create_user(self, email: str, password: str) -> User:
        return User(
            id="1",
            email=email.lower(),
            password_hash=f"hashed-{password}",
            created_at=datetime.now(timezone.utc),
        )

    async def delete_user(self, email: str, password: str) -> None:
        if email != "person@example.com" or password != "abc":
            raise InvalidCredentialsError
        self.deleted_credentials = (email, password)


class AccountApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        app = FastAPI()
        app.include_router(router)
        self.controller = FakeUserController()
        app.dependency_overrides[get_user_controller] = lambda: self.controller
        self.client = TestClient(app)

    def test_user_can_create_an_account(self) -> None:
        response = self.client.post(
            "/accounts",
            json={"email": "person@example.com", "password": "abc"},
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["email"], "person@example.com")

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

    def test_login_and_session_endpoints_are_not_available(self) -> None:
        self.assertEqual(self.client.post("/auth/login", json={}).status_code, 404)
        self.assertEqual(self.client.get("/auth/me").status_code, 404)


if __name__ == "__main__":
    unittest.main()
