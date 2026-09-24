import unittest
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.user import get_user_controller, router
from controllers.user import InvalidCredentialsError
from models.user import User, UserCreate, UserType


class FakeUserController:
    def __init__(self) -> None:
        self.deleted_credentials: tuple[str, str] | None = None

    async def create_user(self, payload: UserCreate) -> User:
        return User(
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

    def test_login_and_session_endpoints_are_not_available(self) -> None:
        self.assertEqual(self.client.post("/auth/login", json={}).status_code, 404)
        self.assertEqual(self.client.get("/auth/me").status_code, 404)


if __name__ == "__main__":
    unittest.main()
