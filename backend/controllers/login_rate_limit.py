"""MongoDB-backed fixed-window rate limiting for account requests."""

from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Any

from pymongo import ReturnDocument


LOGIN_ATTEMPT_LIMIT = 5
LOGIN_ATTEMPT_WINDOW = timedelta(minutes=15)
ACCOUNT_CREATION_LIMIT = 5
ACCOUNT_CREATION_WINDOW = timedelta(minutes=15)


class FixedWindowRateLimiter:
    def __init__(self, collection: Any, limit: int, window: timedelta) -> None:
        self._collection = collection
        self._limit = limit
        self._window = window

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
        remaining = (window_start + self._window - current_time).total_seconds()
        if remaining <= 0 or record.get("attempts", 0) < self._limit:
            return None
        return max(1, ceil(remaining))

    async def record_request(
        self,
        key: str,
        now: datetime | None = None,
    ) -> int | None:
        current_time = now or datetime.now(timezone.utc)
        window_start = current_time - self._window
        reset_window = {
            "$lte": [
                {"$ifNull": ["$window_started_at", window_start]},
                window_start,
            ]
        }
        record = await self._collection.find_one_and_update(
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
                                current_time + self._window,
                                "$expires_at",
                            ]
                        },
                    }
                }
            ],
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        if record is None or record.get("attempts", 0) <= self._limit:
            return None
        started_at = record["window_started_at"]
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        remaining = (started_at + self._window - current_time).total_seconds()
        return max(1, ceil(remaining))

    async def clear(self, key: str) -> None:
        await self._collection.delete_one({"_id": key})


class LoginAttemptLimiter(FixedWindowRateLimiter):
    def __init__(self, collection: Any) -> None:
        super().__init__(collection, LOGIN_ATTEMPT_LIMIT, LOGIN_ATTEMPT_WINDOW)

    async def record_failure(
        self,
        key: str,
        now: datetime | None = None,
    ) -> None:
        await self.record_request(key, now)


class AccountCreationLimiter(FixedWindowRateLimiter):
    def __init__(self, collection: Any) -> None:
        super().__init__(
            collection,
            ACCOUNT_CREATION_LIMIT,
            ACCOUNT_CREATION_WINDOW,
        )
