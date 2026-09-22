import unittest
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.user import get_user_controller, router
from models.user import User


class FakeUserController:
    async def create_user(self, email: str, password: str) -> User:
        return User(
            id="1",
            email=email.lower(),
            password_hash=f"hashed-{password}",
            created_at=datetime.now(timezone.utc),
        )


class AuthApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_user_controller] = FakeUserController
        self.client = TestClient(app)

    def test_user_can_create_an_account(self) -> None:
        response = self.client.post(
            "/auth/signup",
            json={"email": "person@example.com", "password": "abc"},
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["email"], "person@example.com")


if __name__ == "__main__":
    unittest.main()
