from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi.concurrency import run_in_threadpool
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from controllers.security import (
    DUMMY_PASSWORD_HASH,
    hash_password,
    verify_password,
)
from models.user import User, UserCreate, UserType


class UserAlreadyExistsError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class UserController:
    def __init__(self, database: AsyncDatabase) -> None:
        self._users = database.get_collection("users")

    async def ensure_indexes(self) -> None:
        await self._users.create_index("email", unique=True)
        await self._users.create_index("username", unique=True)
        await self._users.create_index("uuid", unique=True)

    async def create_user(self, payload: UserCreate) -> User:
        normalized_email = self._normalize_email(str(payload.email))
        password_hash = await run_in_threadpool(hash_password, payload.password)
        created_at = datetime.now(timezone.utc)
        document = {
            "username": payload.username,
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "email": normalized_email,
            "password_hash": password_hash,
            "uuid": str(uuid4()),
            "year_graduation": payload.year_graduation,
            "type": payload.type.value,
            "created_at": created_at,
            "home_city": payload.home_city,
        }

        try:
            await self._users.insert_one(document)
        except DuplicateKeyError as error:
            raise UserAlreadyExistsError from error

        return User(
            username=document["username"],
            first_name=document["first_name"],
            last_name=document["last_name"],
            email=document["email"],
            password_hash=document["password_hash"],
            uuid=document["uuid"],
            year_graduation=document["year_graduation"],
            type=payload.type,
            created_at=document["created_at"],
            home_city=document["home_city"],
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

        result = await self._users.delete_one({"uuid": user.uuid})
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
            username=document["username"],
            first_name=document["first_name"],
            last_name=document["last_name"],
            email=document["email"],
            password_hash=document["password_hash"],
            uuid=document["uuid"],
            year_graduation=document.get("year_graduation"),
            type=UserType(document["type"]),
            created_at=document["created_at"],
            home_city=document["home_city"],
        )
