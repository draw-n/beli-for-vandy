from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ReportTargetType(str, Enum):
    REVIEW = "review"
    PHOTO = "photo"
    ACCOUNT = "account"


class ReportStatus(str, Enum):
    OPEN = "open"
    SKIPPED = "skipped"
    DISMISSED = "dismissed"
    RESOLVED = "resolved"
    ESCALATED = "escalated"


class ModerationAction(str, Enum):
    HIDE = "hide"
    RESTORE = "restore"
    REMOVE = "remove"
    SKIP = "skip"
    DISMISS = "dismiss"
    ESCALATE = "escalate"
    DELETE = "delete"


class ReportCreate(BaseModel):
    target_type: ReportTargetType
    target_id: str = Field(min_length=1)
    reason: str = Field(min_length=1, max_length=500)


class ReportResolution(BaseModel):
    action: ReportStatus
    resolution: str | None = Field(default=None, max_length=1000)


class ModerationReason(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class BulkModerationRequest(BaseModel):
    target_ids: list[str] = Field(min_length=1, max_length=100)
    action: ModerationAction
    reason: str = Field(min_length=1, max_length=1000)


class SuspensionRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)
    suspended_until: datetime | None = None
    appeal_notes: str | None = Field(default=None, max_length=1000)


class AccountBlockCreate(BaseModel):
    email: str | None = None
    domain: str | None = None
    username: str | None = None
    reason: str = Field(min_length=1, max_length=1000)
    expires_at: datetime | None = None


class AuditRecord(BaseModel):
    uuid: str
    action: str
    actor_user_id: str
    target_type: str
    target_id: str
    reason: str | None = None
    created_at: datetime
    metadata: dict[str, object] = Field(default_factory=dict)
