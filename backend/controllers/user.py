from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from controllers.security import (
    DUMMY_PASSWORD_HASH,
    hash_password,
    verify_password,
)
from models.user import StoredUser, UserCreate
from controllers.moderation import ModerationController


class UserAlreadyExistsError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InvalidRoleChangeError(Exception):
    pass


class UserController:
    def __init__(
        self,
        database: AsyncIOMotorDatabase,
        account_blocks_collection: Any | None = None,
    ) -> None:
        self._database = database
        self._users = database.get_collection("users")
        self._account_blocks = account_blocks_collection

    async def ensure_indexes(self) -> None:
        await self._users.create_index("email", unique=True)
        await self._users.create_index("username", unique=True)
        await self._users.create_index("uuid", unique=True)
        await self.backfill_account_fields()

    async def backfill_account_fields(self) -> None:
        """Populate fields introduced after the initial user schema."""
        await self._users.update_many(
            {"role": {"$exists": False}},
            {"$set": {"role": "user"}},
        )
        await self._users.update_many(
            {"status": {"$exists": False}},
            {"$set": {"status": "active"}},
        )
        await self._users.update_many(
            {"security_version": {"$exists": False}},
            {"$set": {"security_version": 0}},
        )

    async def bootstrap_first_admin(self, identifier: str | None) -> bool:
        """Promote one configured account, but only while no admin exists."""
        if not identifier or await self._users.count_documents({"role": "admin"}) > 0:
            return False

        normalized_identifier = identifier.strip().lower()
        user = await self._users.find_one(
            {
                "$or": [
                    {"email": normalized_identifier},
                    {"username": identifier.strip()},
                ]
            }
        )
        if user is None:
            return False

        result = await self._users.update_one(
            {"uuid": user["uuid"], "role": {"$ne": "admin"}},
            {"$set": {"role": "admin"}, "$inc": {"security_version": 1}},
        )
        return result.modified_count == 1

    async def activate_expired_suspension(self, user_uuid: str) -> bool:
        """Reactivate an expired suspension and invalidate existing tokens."""
        now = datetime.now(timezone.utc)
        result = await self._users.update_one(
            {
                "uuid": user_uuid,
                "status": "suspended",
                "suspended_until": {"$ne": None, "$lte": now},
            },
            {
                "$set": {"status": "active"},
                "$unset": {"suspended_until": "", "suspension_reason": ""},
                "$inc": {"security_version": 1},
            },
        )
        return result.modified_count == 1

    async def change_role(
        self,
        target_uuid: str,
        role: str,
        actor_uuid: str,
        actor_password: str,
    ) -> StoredUser:
        target = self._to_user(await self._users.find_one({"uuid": target_uuid}))
        actor = self._to_user(await self._users.find_one({"uuid": actor_uuid}))
        if target is None or actor is None:
            raise InvalidRoleChangeError

        if not await run_in_threadpool(
            verify_password, actor_password, actor.password_hash
        ):
            raise InvalidRoleChangeError

        if role not in {"user", "moderator", "admin"}:
            raise InvalidRoleChangeError
        if target.role == role:
            return target
        if target.role == "admin" and role != "admin":
            admin_count = await self._users.count_documents({"role": "admin"})
            if admin_count <= 1:
                raise InvalidRoleChangeError

        updated = await self._users.find_one_and_update(
            {"uuid": target_uuid, "role": target.role},
            {"$set": {"role": role}, "$inc": {"security_version": 1}},
            return_document=ReturnDocument.AFTER,
        )
        if updated is None:
            raise InvalidRoleChangeError
        await self._database.get_collection("moderation_audit").insert_one(
            {
                "uuid": str(uuid4()),
                "action": "change_role",
                "actor_user_id": actor_uuid,
                "target_type": "account",
                "target_id": target_uuid,
                "reason": "Privilege change confirmed by administrator",
                "metadata": {"from": target.role, "to": role},
                "created_at": datetime.now(timezone.utc),
            }
        )
        return StoredUser.model_validate(updated)

    async def create_user(self, payload: UserCreate) -> StoredUser:
        normalized_email = self._normalize_email(str(payload.email))
        if self._account_blocks is not None and await ModerationController(
            self._database, account_blocks_collection=self._account_blocks
        ).registration_blocked(normalized_email, payload.username):
            raise UserAlreadyExistsError
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
        if user is not None and user.status == "suspended":
            await self.activate_expired_suspension(user.uuid)
            user = self._to_user(
                await self._users.find_one({"username": username.strip()})
            )
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

