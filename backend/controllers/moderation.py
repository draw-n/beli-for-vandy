from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from models.moderation import (
    AccountBlockCreate,
    ReportCreate,
    ReportResolution,
    ReportStatus,
    ReportTargetType,
)


class ModerationError(Exception):
    pass


class TargetNotFoundError(ModerationError):
    pass


class InvalidModerationActionError(ModerationError):
    pass


class ModerationController:
    def __init__(self, database: Any, account_blocks_collection: Any | None = None) -> None:
        self._database = database
        self._reports = database.get_collection("reports")
        self._audit = database.get_collection("moderation_audit")
        self._blocks = (
            account_blocks_collection
            if account_blocks_collection is not None
            else database.get_collection("account_blocks")
        )
        self._users = database.get_collection("users")
        self._reviews = database.get_collection("reviews")

    def _photo_files(self) -> Any:
        return self._database.get_collection("photos.files")

    async def ensure_indexes(self) -> None:
        await self._reports.create_index([("status", 1), ("created_at", 1)])
        await self._reports.create_index([("target_type", 1), ("reason", 1)])
        await self._audit.create_index([("created_at", -1)])
        await self._audit.create_index([("target_type", 1), ("target_id", 1)])
        await self._blocks.create_index("expires_at")
        await self._blocks.create_index("email")
        await self._blocks.create_index("domain")
        await self._blocks.create_index("username")
        await self._reviews.update_many(
            {"visibility": {"$exists": False}},
            {"$set": {"visibility": "public"}},
        )
        await self._reviews.update_many(
            {"moderation_status": {"$exists": False}},
            {"$set": {"moderation_status": "approved"}},
        )

    async def _target_exists(self, target_type: ReportTargetType, target_id: str) -> bool:
        if target_type == ReportTargetType.REVIEW:
            return await self._reviews.find_one({"uuid": target_id}) is not None
        if target_type == ReportTargetType.ACCOUNT:
            return await self._users.find_one({"uuid": target_id}) is not None
        return await self._photo_files().find_one({"_id": target_id}) is not None

    async def create_report(self, payload: ReportCreate, reporter_user_id: str) -> dict[str, Any]:
        if not await self._target_exists(payload.target_type, payload.target_id):
            raise TargetNotFoundError
        existing = await self._reports.find_one(
            {
                "target_type": payload.target_type.value,
                "target_id": payload.target_id,
                "reporter_user_id": reporter_user_id,
                "status": ReportStatus.OPEN.value,
            }
        )
        if existing is not None:
            raise InvalidModerationActionError("You already have an open report for this target.")
        report = {
            "uuid": str(uuid4()),
            "target_type": payload.target_type.value,
            "target_id": payload.target_id,
            "reporter_user_id": reporter_user_id,
            "reason": payload.reason.strip(),
            "status": ReportStatus.OPEN.value,
            "created_at": datetime.now(timezone.utc),
            "resolved_at": None,
            "resolved_by": None,
            "resolution": None,
        }
        await self._reports.insert_one(report)
        report.pop("_id", None)
        return report

    async def queue(
        self,
        *,
        page: int,
        page_size: int,
        target_type: ReportTargetType | None,
        reason: str | None,
        newest_first: bool,
    ) -> dict[str, Any]:
        query: dict[str, Any] = {"status": ReportStatus.OPEN.value}
        if target_type is not None:
            query["target_type"] = target_type.value
        if reason:
            query["reason"] = reason
        cursor = (
            self._reports.find(query)
            .sort("created_at", -1 if newest_first else 1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        reports = []
        async for report in cursor:
            report.pop("_id", None)
            target = await self._target_details(report["target_type"], report["target_id"])
            report["target"] = target
            reports.append(report)
        return {"page": page, "page_size": page_size, "items": reports}

    async def _target_details(self, target_type: str, target_id: str) -> dict[str, Any] | None:
        if target_type == ReportTargetType.REVIEW.value:
            target = await self._reviews.find_one({"uuid": target_id}, {"_id": 0})
            return target
        if target_type == ReportTargetType.ACCOUNT.value:
            return await self._users.find_one(
                {"uuid": target_id},
                {"_id": 0, "uuid": 1, "username": 1, "status": 1, "role": 1},
            )
        return await self._photo_files().find_one(
            {"_id": target_id},
            {"_id": 1, "metadata": 1, "length": 1, "uploadDate": 1},
        )

    async def get_report(self, report_id: str) -> dict[str, Any]:
        report = await self._reports.find_one({"uuid": report_id}, {"_id": 0})
        if report is None:
            raise TargetNotFoundError
        report["target"] = await self._target_details(report["target_type"], report["target_id"])
        report["history"] = await self.audit_log(
            page=1, page_size=100, target_type=report["target_type"], target_id=report["target_id"]
        )
        return report

    async def resolve_report(
        self, report_id: str, payload: ReportResolution, actor_user_id: str
    ) -> dict[str, Any]:
        report = await self._reports.find_one({"uuid": report_id})
        if report is None:
            raise TargetNotFoundError
        if report["status"] != ReportStatus.OPEN.value:
            raise InvalidModerationActionError("This report is already resolved.")
        if payload.action in {ReportStatus.RESOLVED, ReportStatus.ESCALATED} and not payload.resolution:
            raise InvalidModerationActionError("A resolution is required for this action.")
        now = datetime.now(timezone.utc)
        await self._reports.update_one(
            {"uuid": report_id, "status": ReportStatus.OPEN.value},
            {
                "$set": {
                    "status": payload.action.value,
                    "resolved_at": now,
                    "resolved_by": actor_user_id,
                    "resolution": payload.resolution,
                }
            },
        )
        await self.record_audit(
            action=payload.action.value,
            actor_user_id=actor_user_id,
            target_type=report["target_type"],
            target_id=report["target_id"],
            reason=payload.resolution,
        )
        return await self.get_report(report_id)

    async def moderate_review(
        self, review_id: str, visibility: str, actor_user_id: str, reason: str
    ) -> dict[str, Any]:
        if visibility not in {"public", "hidden", "removed"}:
            raise InvalidModerationActionError("Unsupported review visibility.")
        if visibility != "public" and not reason.strip():
            raise InvalidModerationActionError("A reason is required.")
        result = await self._reviews.update_one(
            {"uuid": review_id},
            {"$set": {"visibility": visibility, "moderation_status": "approved" if visibility == "public" else "rejected"}},
        )
        if result.matched_count == 0:
            raise TargetNotFoundError
        await self.record_audit("restore_review" if visibility == "public" else "hide_review" if visibility == "hidden" else "remove_review", actor_user_id, "review", review_id, reason)
        return await self._reviews.find_one({"uuid": review_id}, {"_id": 0})

    async def moderate_photo(
        self, photo_id: str, status: str, actor_user_id: str, reason: str
    ) -> dict[str, Any]:
        if status not in {"approved", "hidden", "removed"}:
            raise InvalidModerationActionError("Unsupported photo status.")
        if status != "approved" and not reason.strip():
            raise InvalidModerationActionError("A reason is required.")
        result = await self._photo_files().update_one(
            {"_id": photo_id},
            {"$set": {"metadata.status": status, "metadata.moderated_at": datetime.now(timezone.utc), "metadata.moderation_reason": reason}},
        )
        if result.matched_count == 0:
            raise TargetNotFoundError
        await self.record_audit("restore_photo" if status == "approved" else "hide_photo" if status == "hidden" else "remove_photo", actor_user_id, "photo", photo_id, reason)
        return await self._target_details("photo", photo_id) or {}

    async def record_audit(
        self,
        action: str,
        actor_user_id: str,
        target_type: str,
        target_id: str,
        reason: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        record = {
            "uuid": str(uuid4()),
            "action": action,
            "actor_user_id": actor_user_id,
            "target_type": target_type,
            "target_id": target_id,
            "reason": reason,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc),
        }
        await self._audit.insert_one(record)
        record.pop("_id", None)
        return record

    async def audit_log(
        self,
        *,
        page: int,
        page_size: int,
        target_type: str | None = None,
        target_id: str | None = None,
    ) -> list[dict[str, Any]]:
        query: dict[str, Any] = {}
        if target_type:
            query["target_type"] = target_type
        if target_id:
            query["target_id"] = target_id
        cursor = self._audit.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
        return [record async for record in cursor]

    async def suspend_account(
        self, user_id: str, actor_user_id: str, reason: str, suspended_until: datetime | None, appeal_notes: str | None
    ) -> dict[str, Any]:
        if not reason.strip():
            raise InvalidModerationActionError("A reason is required.")
        target = await self._users.find_one({"uuid": user_id})
        if target is None:
            raise TargetNotFoundError
        if target.get("role") == "admin":
            active_admins = await self._users.count_documents(
                {"role": "admin", "status": {"$ne": "deleted"}}
            )
            if active_admins <= 1:
                raise InvalidModerationActionError("The last administrator cannot be suspended.")
        result = await self._users.update_one(
            {"uuid": user_id, "status": {"$ne": "deleted"}},
            {"$set": {"status": "suspended", "suspended_until": suspended_until, "suspension_reason": reason, "appeal_notes": appeal_notes}, "$inc": {"security_version": 1}},
        )
        if result.matched_count == 0:
            raise TargetNotFoundError
        await self.record_audit("suspend_account", actor_user_id, "account", user_id, reason)
        return await self._users.find_one({"uuid": user_id}, {"_id": 0})

    async def unsuspend_account(self, user_id: str, actor_user_id: str, reason: str) -> dict[str, Any]:
        result = await self._users.update_one(
            {"uuid": user_id, "status": "suspended"},
            {"$set": {"status": "active"}, "$unset": {"suspended_until": "", "suspension_reason": "", "appeal_notes": ""}, "$inc": {"security_version": 1}},
        )
        if result.matched_count == 0:
            raise TargetNotFoundError
        await self.record_audit("unsuspend_account", actor_user_id, "account", user_id, reason)
        return await self._users.find_one({"uuid": user_id}, {"_id": 0})

    async def create_block(self, payload: AccountBlockCreate, actor_user_id: str) -> dict[str, Any]:
        email = payload.email.strip().lower() if payload.email else None
        domain = payload.domain.strip().lower().lstrip("@") if payload.domain else None
        username = payload.username.strip().lower() if payload.username else None
        if not any((email, domain, username)):
            raise InvalidModerationActionError("An email, domain, or username is required.")
        block = {**payload.model_dump(), "email": email, "domain": domain, "username": username, "actor_user_id": actor_user_id, "created_at": datetime.now(timezone.utc), "uuid": str(uuid4())}
        await self._blocks.insert_one(block)
        await self.record_audit("block_account_creation", actor_user_id, "account_block", block["uuid"], payload.reason)
        block.pop("_id", None)
        return block

    async def delete_block(self, block_id: str, actor_user_id: str, reason: str) -> None:
        result = await self._blocks.delete_one({"uuid": block_id})
        if result.deleted_count == 0:
            raise TargetNotFoundError
        await self.record_audit("unblock_account_creation", actor_user_id, "account_block", block_id, reason)

    async def registration_blocked(self, email: str, username: str) -> bool:
        now = datetime.now(timezone.utc)
        normalized_email = email.strip().lower()
        normalized_username = username.strip().lower()
        domain = normalized_email.rsplit("@", 1)[-1]
        for criterion in (
            {"email": normalized_email},
            {"domain": domain},
            {"username": normalized_username},
        ):
            block = await self._blocks.find_one(criterion)
            if block is None:
                continue
            expires_at = block.get("expires_at")
            if expires_at is not None and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at is None or expires_at > now:
                return True
        return False

    async def delete_content(
        self, target_type: ReportTargetType, target_id: str, actor_user_id: str, reason: str
    ) -> None:
        if not reason.strip():
            raise InvalidModerationActionError("A reason is required.")
        if target_type == ReportTargetType.REVIEW:
            result = await self._reviews.delete_one({"uuid": target_id})
        elif target_type == ReportTargetType.ACCOUNT:
            result = await self._users.delete_one({"uuid": target_id})
        else:
            if await self._photo_files().find_one({"_id": target_id}) is None:
                raise TargetNotFoundError
            await self._photo_files().delete_one({"_id": target_id})
            await self._database.get_collection("photos.chunks").delete_many(
                {"files_id": target_id}
            )
            result = None
        if result is not None and result.deleted_count == 0:
            raise TargetNotFoundError
        await self.record_audit("delete_content", actor_user_id, target_type.value, target_id, reason)
