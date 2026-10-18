import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

import database
from controllers.auth import issue_access_token
from models.user import AccountStatus, UserRole, UserType
from settings import get_settings

from main import app

TEST_TOKEN_SECRET = "backend-test-secret-with-sufficient-entropy"
DEFAULT_USER_ID = "user-123"
TEST_USER_IDS = {
    DEFAULT_USER_ID,
    "user-456",
    "user-789",
    "me",
    "ava",
    "owner-uuid",
    "other-uuid",
}


class AuthenticatedTestClient(AsyncClient):
    async def request(self, method, url, *args, **kwargs):
        if kwargs.get("headers") is None:
            token, _ = issue_access_token(DEFAULT_USER_ID, TEST_TOKEN_SECRET)
            kwargs["headers"] = {"Authorization": f"Bearer {token}"}
        response = await super().request(method, url, *args, **kwargs)
        return response


@pytest.fixture
def mock_db():
    client = AsyncMongoMockClient()

    return client["test_database"]


@pytest_asyncio.fixture
async def client(mock_db, monkeypatch):
    mock_reviews_collection = mock_db["reviews"]
    mock_follows_collection = mock_db["follows"]
    mock_locations_collection = mock_db["locations"]
    mock_users_collection = mock_db["users"]

    monkeypatch.setattr(
        database,
        "reviews_collection",
        mock_reviews_collection
    )

    monkeypatch.setattr(
        database,
        "follows_collection",
        mock_follows_collection
    )

    monkeypatch.setattr(
        database,
        "locations_collection",
        mock_locations_collection
    )
    monkeypatch.setattr(database, "users_collection", mock_users_collection)
    monkeypatch.setenv("AUTH_TOKEN_SECRET", TEST_TOKEN_SECRET)
    get_settings.cache_clear()

    now = datetime.now(timezone.utc)
    await mock_users_collection.insert_many(
        [
            {
                "username": user_id,
                "first_name": "Test",
                "last_name": "User",
                "email": f"{user_id}@example.com",
                "password_hash": "unused",
                "uuid": user_id,
                "year_graduation": 2027,
                "type": UserType.STUDENT.value,
                "created_at": now,
                "home_city": "Nashville",
                "role": UserRole.USER.value,
                "status": AccountStatus.ACTIVE.value,
                "security_version": 0,
            }
            for user_id in TEST_USER_IDS
        ]
    )

    transport = ASGITransport(app=app)

    async with AuthenticatedTestClient(
        transport=transport,
        base_url="http://test"
    ) as client:
        yield client

    await mock_reviews_collection.drop()
    await mock_follows_collection.drop()
    await mock_locations_collection.drop()
    await mock_users_collection.drop()
    get_settings.cache_clear()
