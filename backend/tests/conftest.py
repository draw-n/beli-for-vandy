import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

import database

from main import app


@pytest.fixture
def mock_db():
    client = AsyncMongoMockClient()

    return client["test_database"]


@pytest_asyncio.fixture
async def client(mock_db, monkeypatch):
    mock_reviews_collection = mock_db["reviews"]
    mock_follows_collection = mock_db["follows"]
    mock_locations_collection = mock_db["locations"]

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

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test"
    ) as client:
        yield client

    await mock_reviews_collection.drop()
    await mock_follows_collection.drop()

