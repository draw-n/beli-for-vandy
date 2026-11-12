from datetime import datetime, timezone

import pytest
from mongomock_motor import AsyncMongoMockClient

from controllers.login_rate_limit import (
    LOGIN_ATTEMPT_LIMIT,
    LOGIN_ATTEMPT_WINDOW,
    LoginAttemptLimiter,
)


@pytest.mark.asyncio
async def test_login_attempts_are_limited_and_expire_after_the_window() -> None:
    collection = AsyncMongoMockClient()["test"]["login_attempts"]
    limiter = LoginAttemptLimiter(collection)
    now = datetime.now(timezone.utc)
    key = "client-key"
    await limiter.ensure_indexes()
    indexes = await collection.index_information()
    assert any(index.get("expireAfterSeconds") == 0 for index in indexes.values())

    for _ in range(LOGIN_ATTEMPT_LIMIT):
        await limiter.record_failure(key, now)

    assert await limiter.retry_after(key, now) == int(LOGIN_ATTEMPT_WINDOW.total_seconds())
    assert await limiter.retry_after(key, now + LOGIN_ATTEMPT_WINDOW) is None

    await limiter.record_failure(key, now + LOGIN_ATTEMPT_WINDOW)
    assert await limiter.retry_after(key, now + LOGIN_ATTEMPT_WINDOW) is None
    await limiter.clear(key)
    assert await limiter.retry_after(key, now + LOGIN_ATTEMPT_WINDOW) is None
