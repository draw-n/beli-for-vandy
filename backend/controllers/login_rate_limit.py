"""MongoDB-backed fixed-window rate limiting for account login attempts."""

from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Any

from pymongo import ReturnDocument


LOGIN_ATTEMPT_LIMIT = 5
LOGIN_ATTEMPT_WINDOW = timedelta(minutes=15)


class LoginAttemptLimiter:
    def __init__(self, collection: Any) -> None:
        self._collection = collection

    async def ensure_indexes(self) -> None:
        await self._collection.create_index("expires_at", expireAfterSeconds=0)

    async def retry_after(self, key: str, now: datetime | None = None) -> int | None:
        current_time = now or datetime.now(timezone.utc)
        record = await self._collection.find_one({"_id": key})
        if record is None:
            return None
        window_start = record.get("window_started_at")
        if not isinstance(window_start, datetime):
            return None
        if window_start.tzinfo is None:
            window_start = window_start.replace(tzinfo=timezone.utc)
        remaining = (window_start + LOGIN_ATTEMPT_WINDOW - current_time).total_seconds()
        if remaining <= 0 or record.get("attempts", 0) < LOGIN_ATTEMPT_LIMIT:
            return None
        return max(1, ceil(remaining))

    async def record_failure(
        self,
        key: str,
        now: datetime | None = None,
    ) -> None:
        current_time = now or datetime.now(timezone.utc)
        reset_window = {
            "$lte": [
                {"$ifNull": ["$window_started_at", current_time - LOGIN_ATTEMPT_WINDOW]},
                current_time - LOGIN_ATTEMPT_WINDOW,
            ]
        }
        await self._collection.find_one_and_update(
            {"_id": key},
            [
                {
                    "$set": {
                        "window_started_at": {
                            "$cond": [reset_window, current_time, "$window_started_at"]
                        },
                        "attempts": {
                            "$cond": [
                                reset_window,
                                1,
                                {"$add": [{"$ifNull": ["$attempts", 0]}, 1]},
                            ]
                        },
                        "expires_at": {
                            "$cond": [
                                reset_window,
                                current_time + LOGIN_ATTEMPT_WINDOW,
                                "$expires_at",
                            ]
                        },
                    }
                }
            ],
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

    async def clear(self, key: str) -> None:
        await self._collection.delete_one({"_id": key})
