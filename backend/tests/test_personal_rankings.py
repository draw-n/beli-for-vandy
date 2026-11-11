import pytest

import database
from controllers.auth import get_current_user_id
from main import app


@pytest.fixture
def auth():
    app.dependency_overrides[get_current_user_id] = lambda: "user-123"
    yield
    app.dependency_overrides.pop(get_current_user_id, None)


@pytest.mark.asyncio
async def test_rankings_require_authentication(client):
    assert (await client.get("/personal-rankings/", headers={})).status_code == 401


@pytest.mark.asyncio
async def test_invalid_rating_is_rejected(client, auth):
    await database.locations_collection.insert_one({"uuid": "loc-1", "name": "Commons"})
    assert (await client.put("/personal-rankings/loc-1", json={"rating": 0})).status_code == 422
    assert (await client.put("/personal-rankings/loc-1", json={"rating": 11})).status_code == 422


@pytest.mark.asyncio
async def test_nonexistent_location_is_rejected(client, auth):
    assert (await client.put("/personal-rankings/no-such-hall", json={"rating": 8})).status_code == 404


@pytest.mark.asyncio
async def test_user_can_create_a_ranking(client, auth):
    await database.locations_collection.insert_one({"uuid": "loc-1", "name": "Commons"})
    resp = await client.put("/personal-rankings/loc-1", json={"rating": 8})
    assert resp.status_code == 200
    data = resp.json()
    assert data["rating"] == 8 and data["location_id"] == "loc-1" and data["uuid"]


@pytest.mark.asyncio
async def test_updating_does_not_create_duplicate_rankings(client, auth):
    await database.locations_collection.insert_one({"uuid": "loc-1", "name": "Commons"})
    first = await client.put("/personal-rankings/loc-1", json={"rating": 7})
    second = await client.put("/personal-rankings/loc-1", json={"rating": 9})
    assert second.json()["rating"] == 9 and second.json()["uuid"] == first.json()["uuid"]
    assert await database.personal_rankings_collection.count_documents(
        {"user_id": "user-123", "location_id": "loc-1"}
    ) == 1
    assert second.json()["created_at"] == first.json()["created_at"], "created_at must not change on update"
    assert second.json()["updated_at"] >= first.json()["updated_at"], "updated_at must advance after update"


@pytest.mark.asyncio
async def test_one_user_cannot_overwrite_another_users_ranking(client):
    app.dependency_overrides[get_current_user_id] = lambda: "user-123"
    try:
        await database.locations_collection.insert_one({"uuid": "loc-1", "name": "Commons"})
        await client.put("/personal-rankings/loc-1", json={"rating": 9})
        app.dependency_overrides[get_current_user_id] = lambda: "user-456"
        await client.put("/personal-rankings/loc-1", json={"rating": 3})
        app.dependency_overrides[get_current_user_id] = lambda: "user-123"
        resp = await client.get("/personal-rankings/")
        assert resp.json()["rated"][0]["rating"] == 9, "user-123's rating must not be overwritten by user-456"
        assert await database.personal_rankings_collection.count_documents({"location_id": "loc-1"}) == 2
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)


@pytest.mark.asyncio
async def test_one_user_cannot_read_another_users_rankings(client):
    app.dependency_overrides[get_current_user_id] = lambda: "user-123"
    try:
        await database.locations_collection.insert_one({"uuid": "loc-1", "name": "Commons"})
        await client.put("/personal-rankings/loc-1", json={"rating": 9})
        app.dependency_overrides[get_current_user_id] = lambda: "user-456"
        assert (await client.get("/personal-rankings/")).json()["rated"] == []
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)
