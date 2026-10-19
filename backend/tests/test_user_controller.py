import unittest
from copy import deepcopy
from types import SimpleNamespace
from typing import Any

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from controllers.user import InvalidCredentialsError, UserAlreadyExistsError, UserController
from models.user import UserCreate, UserType


class FakeCollection:
    def __init__(self) -> None:
        self.documents: list[dict[str, Any]] = []

    async def insert_one(self, document: dict[str, Any]) -> SimpleNamespace:
        if any(
            existing.get("username") == document.get("username")
            or existing.get("email") == document.get("email")
            for existing in self.documents
        ):
            raise DuplicateKeyError("duplicate account identity")
        stored_document = deepcopy(document)
        stored_document["_id"] = ObjectId()
        self.documents.append(stored_document)
        return SimpleNamespace(inserted_id=stored_document["_id"])

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        return next(
            (deepcopy(document) for document in self.documents if self._matches(document, query)),
            None,
        )

    async def delete_one(self, query: dict[str, Any]) -> SimpleNamespace:
        for index, document in enumerate(self.documents):
            if self._matches(document, query):
                self.documents.pop(index)
                return SimpleNamespace(deleted_count=1)
        return SimpleNamespace(deleted_count=0)

    @staticmethod
    def _matches(document: dict[str, Any], query: dict[str, Any]) -> bool:
        return all(document.get(key) == value for key, value in query.items())


class FakeDatabase:
    def __init__(self) -> None:
        self.users = FakeCollection()
        self.requested_collection_name: str | None = None

    def get_collection(self, name: str) -> FakeCollection:
        self.requested_collection_name = name
        return self.users


class UserControllerTestCase(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.database = FakeDatabase()
        self.controller = UserController(self.database)  # type: ignore[arg-type]

    @staticmethod
    def user_payload(
        password: str = "abc",
        *,
        username: str = "commodore",
        email: str = "Person@Example.com",
    ) -> UserCreate:
        return UserCreate(
            username=username,
            first_name="Cornelius",
            last_name="Vanderbilt",
            email=email,
            password=password,
            year_graduation=2027,
            type=UserType.STUDENT,
            home_city="Nashville",
        )

    async def test_created_account_can_be_deleted_with_its_password(self) -> None:
        user = await self.controller.create_user(self.user_payload())

        self.assertEqual(self.database.requested_collection_name, "users")
        self.assertEqual(user.email, "person@example.com")
        self.assertNotEqual(user.password_hash, "abc")
        self.assertEqual(user.username, "commodore")
        self.assertEqual(user.type, UserType.STUDENT)
        self.assertEqual(user.year_graduation, 2027)
        stored_user = self.database.users.documents[0]
        self.assertEqual(
            set(stored_user),
            {
                "_id",
                "username",
                "first_name",
                "last_name",
                "email",
                "password_hash",
                "uuid",
                "year_graduation",
                "type",
                "created_at",
                "home_city",
                "role",
                "status",
                "security_version",
            },
        )
        self.assertEqual(stored_user["type"], "student")

        await self.controller.delete_user(user.uuid, "PERSON@example.com", "abc")

        self.assertEqual(self.database.users.documents, [])

    async def test_incorrect_password_does_not_delete_account(self) -> None:
        await self.controller.create_user(self.user_payload())

        with self.assertRaises(InvalidCredentialsError):
            await self.controller.delete_user(
                "missing-user",
                "person@example.com",
                "wrong",
            )

        self.assertEqual(len(self.database.users.documents), 1)

    async def test_created_account_can_be_authenticated(self) -> None:
        await self.controller.create_user(self.user_payload())

        user = await self.controller.authenticate_user("commodore", "abc")

        self.assertEqual(user.username, "commodore")
        self.assertEqual(user.email, "person@example.com")

    async def test_authentication_rejects_invalid_credentials(self) -> None:
        await self.controller.create_user(self.user_payload())

        with self.assertRaises(InvalidCredentialsError):
            await self.controller.authenticate_user("commodore", "wrong")

        with self.assertRaises(InvalidCredentialsError):
            await self.controller.authenticate_user("unknown", "abc")

    async def test_duplicate_username_or_normalized_email_is_rejected(self) -> None:
        await self.controller.create_user(self.user_payload())

        with self.assertRaises(UserAlreadyExistsError):
            await self.controller.create_user(
                self.user_payload(username="commodore", email="other@example.com")
            )
        with self.assertRaises(UserAlreadyExistsError):
            await self.controller.create_user(
                self.user_payload(username="another-user", email=" PERSON@example.com ")
            )

        self.assertEqual(len(self.database.users.documents), 1)

if __name__ == "__main__":
    unittest.main()
