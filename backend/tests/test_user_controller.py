import unittest
from copy import deepcopy
from types import SimpleNamespace
from typing import Any

from bson import ObjectId

from controllers.user import InvalidCredentialsError, UserController


class FakeCollection:
    def __init__(self) -> None:
        self.documents: list[dict[str, Any]] = []

    async def insert_one(self, document: dict[str, Any]) -> SimpleNamespace:
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
        self.accounts = FakeCollection()

    def get_collection(self, _: str) -> FakeCollection:
        return self.accounts


class UserControllerTestCase(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.database = FakeDatabase()
        self.controller = UserController(self.database)  # type: ignore[arg-type]

    async def test_created_account_can_be_deleted_with_its_password(self) -> None:
        user = await self.controller.create_user(" Person@Example.com ", "abc")

        self.assertEqual(user.email, "person@example.com")
        self.assertNotEqual(user.password_hash, "abc")

        await self.controller.delete_user("PERSON@example.com", "abc")

        self.assertEqual(self.database.accounts.documents, [])

    async def test_incorrect_password_does_not_delete_account(self) -> None:
        await self.controller.create_user("person@example.com", "abc")

        with self.assertRaises(InvalidCredentialsError):
            await self.controller.delete_user("person@example.com", "wrong")

        self.assertEqual(len(self.database.accounts.documents), 1)


if __name__ == "__main__":
    unittest.main()
