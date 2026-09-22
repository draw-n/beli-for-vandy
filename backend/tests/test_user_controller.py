import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from controllers.user import (
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserController,
)


class FakeCollection:
    def __init__(self) -> None:
        self.documents: list[dict[str, Any]] = []

    async def create_index(self, *_: Any, **__: Any) -> None:
        return None

    async def insert_one(self, document: dict[str, Any]) -> SimpleNamespace:
        if "email" in document and any(
            existing.get("email") == document["email"] for existing in self.documents
        ):
            raise DuplicateKeyError("duplicate email")

        stored_document = document.copy()
        stored_document.setdefault("_id", ObjectId())
        self.documents.append(stored_document)
        return SimpleNamespace(inserted_id=stored_document["_id"])

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        return next(
            (
                document.copy()
                for document in self.documents
                if all(document.get(key) == value for key, value in query.items())
            ),
            None,
        )


class FakeDatabase:
    def __init__(self) -> None:
        self.collections: dict[str, FakeCollection] = {}

    def get_collection(self, name: str) -> FakeCollection:
        return self.collections.setdefault(name, FakeCollection())


class UserControllerTestCase(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.database = FakeDatabase()
        self.controller = UserController(self.database, session_ttl_seconds=3600)  # type: ignore[arg-type]

    async def test_create_user_normalizes_email_and_hashes_password(self) -> None:
        user = await self.controller.create_user(" Person@Example.com ", "abc")

        self.assertEqual(user.email, "person@example.com")
        self.assertNotEqual(user.password_hash, "abc")

    async def test_create_user_rejects_duplicate_email(self) -> None:
        await self.controller.create_user("person@example.com", "abc")

        with self.assertRaises(UserAlreadyExistsError):
            await self.controller.create_user("person@example.com", "different")

    async def test_login_creates_an_opaque_session(self) -> None:
        user = await self.controller.create_user("person@example.com", "abc")

        session = await self.controller.login("person@example.com", "abc")
        authenticated_user = await self.controller.get_user_for_session(session.token)

        self.assertEqual(session.user, user)
        self.assertEqual(authenticated_user, user)
        session_document = self.database.get_collection("auth_sessions").documents[0]
        self.assertNotEqual(session_document["token_hash"], session.token)
        self.assertGreater(session_document["expires_at"], datetime.now(timezone.utc))

    async def test_login_rejects_invalid_credentials(self) -> None:
        with self.assertRaises(InvalidCredentialsError):
            await self.controller.login("missing@example.com", "wrong")


if __name__ == "__main__":
    unittest.main()
