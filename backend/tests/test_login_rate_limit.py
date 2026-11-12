from datetime import datetime, timezone

import pytest
from mongomock_motor import AsyncMongoMockClient

from controllers.login_rate_limit import (
    ACCOUNT_CREATION_LIMIT,
    ACCOUNT_CREATION_WINDOW,
    LOGIN_ATTEMPT_LIMIT,
    LOGIN_ATTEMPT_WINDOW,
    AccountCreationLimiter,
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


@pytest.mark.asyncio
async def test_account_creation_limiter_allows_limit_then_rejects_until_window_expires() -> None:
    collection = AsyncMongoMockClient()["test"]["account_creation_attempts"]
    limiter = AccountCreationLimiter(collection)
    now = datetime.now(timezone.utc)
    key = "client-key"

    for _ in range(ACCOUNT_CREATION_LIMIT):
        assert await limiter.record_request(key, now) is None

    retry_after = await limiter.record_request(key, now)
    assert retry_after == int(ACCOUNT_CREATION_WINDOW.total_seconds())
    assert await limiter.retry_after(key, now) == int(ACCOUNT_CREATION_WINDOW.total_seconds())
    assert await limiter.record_request(key, now + ACCOUNT_CREATION_WINDOW) is None
