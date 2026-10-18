from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from controllers.security import (
    DUMMY_PASSWORD_HASH,
    hash_password,
    verify_password,
)
from models.user import StoredUser, UserCreate


class UserAlreadyExistsError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class UserController:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self._users = database.get_collection("users")

    async def ensure_indexes(self) -> None:
        await self._users.create_index("email", unique=True)
        await self._users.create_index("username", unique=True)
        await self._users.create_index("uuid", unique=True)

    async def create_user(self, payload: UserCreate) -> StoredUser:
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
            "role": "user",
            "status": "active",
            "security_version": 0,
        }

        try:
            await self._users.insert_one(document)
        except DuplicateKeyError as error:
            raise UserAlreadyExistsError from error

        return StoredUser.model_validate(document)

    async def authenticate_user(self, username: str, password: str) -> StoredUser:
        user = self._to_user(await self._users.find_one({"username": username.strip()}))
        encoded_password = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
        password_is_valid = await run_in_threadpool(
            verify_password,
            password,
            encoded_password,
        )

        if user is None or not password_is_valid:
            raise InvalidCredentialsError
        if user.status != "active":
            raise InvalidCredentialsError

        return user

    async def delete_user(self, user_uuid: str, email: str, password: str) -> None:
        normalized_email = self._normalize_email(email)
        user = self._to_user(
            await self._users.find_one({"email": normalized_email, "uuid": user_uuid})
        )
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
        
    async def get_users(self) -> list[StoredUser]:
        users: list[StoredUser] = []

        cursor = self._users.find()

        async for document in cursor:
            users.append(StoredUser.model_validate(document))

        return users

    @staticmethod
    def _normalize_email(email: str) -> str:
        return email.strip().lower()

    @staticmethod
    def _to_user(document: dict[str, Any] | None) -> StoredUser | None:
        if document is None:
            return None

        return StoredUser.model_validate(document)

    
