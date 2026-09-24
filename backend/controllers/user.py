from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi.concurrency import run_in_threadpool
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from controllers.security import (
    DUMMY_PASSWORD_HASH,
    hash_password,
    verify_password,
)
from models.user import User


class UserAlreadyExistsError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class UserController:
    def __init__(self, database: AsyncDatabase) -> None:
        self._users = database.get_collection("accounts")

    async def ensure_indexes(self) -> None:
        await self._users.create_index("email", unique=True)

    async def create_user(self, email: str, password: str) -> User:
        normalized_email = self._normalize_email(email)
        password_hash = await run_in_threadpool(hash_password, password)
        created_at = datetime.now(timezone.utc)
        document = {
            "email": normalized_email,
            "password_hash": password_hash,
            "created_at": created_at,
        }

        try:
            result = await self._users.insert_one(document)
        except DuplicateKeyError as error:
            raise UserAlreadyExistsError from error

        return User(
            id=str(result.inserted_id),
            email=normalized_email,
            password_hash=password_hash,
            created_at=created_at,
        )

    async def delete_user(self, email: str, password: str) -> None:
        normalized_email = self._normalize_email(email)
        user = self._to_user(await self._users.find_one({"email": normalized_email}))
        encoded_password = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
        password_is_valid = await run_in_threadpool(
            verify_password,
            password,
            encoded_password,
        )

        if user is None or not password_is_valid:
            raise InvalidCredentialsError

        result = await self._users.delete_one({"_id": ObjectId(user.id)})
        if result.deleted_count != 1:
            raise InvalidCredentialsError

    @staticmethod
    def _normalize_email(email: str) -> str:
        return email.strip().lower()

    @staticmethod
    def _to_user(document: dict[str, Any] | None) -> User | None:
        if document is None:
            return None

        return User(
            id=str(document["_id"]),
            email=document["email"],
            password_hash=document["password_hash"],
            created_at=document["created_at"],
        )
