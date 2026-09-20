from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from pymongo import ASCENDING
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError


class AccountAlreadyExistsError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class Account:
    id: str
    email: str
    password_hash: str
    created_at: datetime


class AccountRepository:
    def __init__(self, database: AsyncDatabase) -> None:
        self._accounts = database.get_collection("accounts")
        self._sessions = database.get_collection("auth_sessions")

    async def ensure_indexes(self) -> None:
        await self._accounts.create_index("email", unique=True)
        await self._sessions.create_index("token_hash", unique=True)
        await self._sessions.create_index(
            [("expires_at", ASCENDING)],
            expireAfterSeconds=0,
        )

    async def create_account(self, email: str, password_hash: str) -> Account:
        created_at = datetime.now(timezone.utc)
        document = {
            "email": email,
            "password_hash": password_hash,
            "created_at": created_at,
        }

        try:
            result = await self._accounts.insert_one(document)
        except DuplicateKeyError as error:
            raise AccountAlreadyExistsError from error

        return Account(
            id=str(result.inserted_id),
            email=email,
            password_hash=password_hash,
            created_at=created_at,
        )

    async def find_account_by_email(self, email: str) -> Account | None:
        document = await self._accounts.find_one({"email": email})
        return self._to_account(document)

    async def create_session(
        self,
        account_id: str,
        token_hash: str,
        expires_at: datetime,
    ) -> None:
        await self._sessions.insert_one(
            {
                "account_id": ObjectId(account_id),
                "token_hash": token_hash,
                "created_at": datetime.now(timezone.utc),
                "expires_at": expires_at,
            }
        )

    async def find_account_by_session_hash(self, token_hash: str) -> Account | None:
        session = await self._sessions.find_one({"token_hash": token_hash})
        if session is None or session["expires_at"] <= datetime.now(timezone.utc):
            return None

        document = await self._accounts.find_one({"_id": session["account_id"]})
        return self._to_account(document)

    @staticmethod
    def _to_account(document: dict[str, Any] | None) -> Account | None:
        if document is None:
            return None

        return Account(
            id=str(document["_id"]),
            email=document["email"],
            password_hash=document["password_hash"],
            created_at=document["created_at"],
        )
