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
    mock_collection = mock_db["reviews"]

    monkeypatch.setattr(
        database,
        "reviews_collection",
        mock_collection
    )

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test"
    ) as client:
        yield client

    await mock_collection.drop()
