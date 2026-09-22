from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from fastapi.concurrency import run_in_threadpool
from pymongo import ASCENDING
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from controllers.security import (
    DUMMY_PASSWORD_HASH,
    generate_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)
from models.user import User


class UserAlreadyExistsError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class AuthenticatedSession:
    user: User
    token: str


class UserController:
    def __init__(self, database: AsyncDatabase, session_ttl_seconds: int) -> None:
        self._users = database.get_collection("accounts")
        self._sessions = database.get_collection("auth_sessions")
        self._session_ttl_seconds = session_ttl_seconds

    async def ensure_indexes(self) -> None:
        await self._users.create_index("email", unique=True)
        await self._sessions.create_index("token_hash", unique=True)
        await self._sessions.create_index(
            [("expires_at", ASCENDING)],
            expireAfterSeconds=0,
        )

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

    async def login(self, email: str, password: str) -> AuthenticatedSession:
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

        token = generate_session_token()
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=self._session_ttl_seconds)
        await self._sessions.insert_one(
            {
                "account_id": ObjectId(user.id),
                "token_hash": hash_session_token(token),
                "created_at": datetime.now(timezone.utc),
                "expires_at": expires_at,
            }
        )
        return AuthenticatedSession(user=user, token=token)

    async def get_user_for_session(self, token: str) -> User | None:
        session = await self._sessions.find_one({"token_hash": hash_session_token(token)})
        if session is None or session["expires_at"] <= datetime.now(timezone.utc):
            return None

        return self._to_user(await self._users.find_one({"_id": session["account_id"]}))

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
