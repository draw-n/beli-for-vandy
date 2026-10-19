import pytest

import database
from controllers.auth import get_current_user_id
from controllers.favorite_dish import ensure_favorite_dish_indexes
from main import app


@pytest.fixture
def authenticated_user():
    app.dependency_overrides[get_current_user_id] = lambda: "user-123"
    yield
    app.dependency_overrides.pop(get_current_user_id, None)


@pytest.mark.asyncio
async def test_favorite_dishes_require_authentication(client):
    response = await client.get("/favorite-dishes/", headers={})

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_users_can_add_list_and_remove_their_favorite_dishes(client, authenticated_user):
    created = await client.post(
        "/favorite-dishes/",
        json={"name": "  Mac   and cheese ", "location_id": "location-1", "location_name": "  Commons  "},
    )

    assert created.status_code == 200
    assert created.json()["name"] == "Mac   and cheese"
    assert created.json()["location_id"] == "location-1"
    assert created.json()["location_name"] == "Commons"
    assert created.json()["created_at"]

    response = await client.get("/favorite-dishes/")
    assert response.status_code == 200
    assert [dish["name"] for dish in response.json()] == ["Mac   and cheese"]

    deleted = await client.delete(f"/favorite-dishes/{created.json()['uuid']}")
    assert deleted.status_code == 204
    assert (await client.get("/favorite-dishes/")).json() == []


@pytest.mark.asyncio
async def test_favorite_dishes_are_private_to_each_authenticated_account(client):
    app.dependency_overrides[get_current_user_id] = lambda: "user-123"
    try:
        created = await client.post(
            "/favorite-dishes/",
            json={"name": "Tacos", "location_id": "location-1", "location_name": "Commons"},
        )
        dish_id = created.json()["uuid"]

        app.dependency_overrides[get_current_user_id] = lambda: "user-456"
        assert (await client.get("/favorite-dishes/")).json() == []
        assert (await client.delete(f"/favorite-dishes/{dish_id}")).status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)


@pytest.mark.asyncio
async def test_favorite_dishes_are_case_insensitive_per_hall_and_reject_blank_names(client, authenticated_user):
    location = {"location_id": "location-1", "location_name": "Commons"}
    created = await client.post("/favorite-dishes/", json={"name": "Pizza", **location})
    duplicate = await client.post("/favorite-dishes/", json={"name": " pizza ", **location})
    second_hall = await client.post(
        "/favorite-dishes/",
        json={"name": "Pizza", "location_id": "location-2", "location_name": "Rand"},
    )
    blank = await client.post("/favorite-dishes/", json={"name": "   ", **location})

    assert created.status_code == 200
    assert duplicate.json()["uuid"] == created.json()["uuid"]
    assert second_hall.status_code == 200
    assert second_hall.json()["uuid"] != created.json()["uuid"]
    assert blank.status_code == 422
    assert len((await client.get("/favorite-dishes/")).json()) == 2


@pytest.mark.asyncio
async def test_favorite_dish_capitalizes_only_its_first_character(client, authenticated_user):
    created = await client.post(
        "/favorite-dishes/",
        json={
            "name": "mAC and cheese",
            "location_id": "location-1",
            "location_name": "Commons",
        },
    )

    assert created.status_code == 200
    assert created.json()["name"] == "Mac and cheese"


@pytest.mark.asyncio
async def test_index_migration_drops_old_name_only_unique_index(client):
    await database.favorite_dishes_collection.create_index(
        [("user_id", 1), ("normalized_name", 1)],
        unique=True,
    )

    await ensure_favorite_dish_indexes()

    indexes = await database.favorite_dishes_collection.index_information()
    assert not any(
        index.get("unique")
        and list(index.get("key", [])) == [("user_id", 1), ("normalized_name", 1)]
        for index in indexes.values()
    )
    assert any(
        index.get("unique")
        and list(index.get("key", []))
        == [("user_id", 1), ("normalized_name", 1), ("location_id", 1)]
        for index in indexes.values()
    )


@pytest.mark.asyncio
async def test_legacy_favorite_is_assigned_its_unique_review_hall(client, authenticated_user):
    await database.favorite_dishes_collection.insert_one({
        "uuid": "legacy-favorite",
        "user_id": "user-123",
        "name": "Mac and cheese",
        "normalized_name": "mac and cheese",
        "created_at": "2026-10-18T12:00:00Z",
    })
    await database.reviews_collection.insert_one({
        "uuid": "review-1",
        "location_id": "location-1",
        "favorite_dishes": ["mac and cheese"],
    })
    await database.locations_collection.insert_one({
        "uuid": "location-1",
        "name": "Commons",
    })

    response = await client.get("/favorite-dishes/")

    assert response.status_code == 200
    assert response.json()[0]["location_id"] == "location-1"
    assert response.json()[0]["location_name"] == "Commons"
    stored = await database.favorite_dishes_collection.find_one({"uuid": "legacy-favorite"})
    assert stored["location_id"] == "location-1"
    assert stored["location_name"] == "Commons"


@pytest.mark.asyncio
async def test_legacy_favorite_can_be_assigned_to_hall_when_source_is_ambiguous(client, authenticated_user):
    await database.favorite_dishes_collection.insert_one({
        "uuid": "legacy-favorite",
        "user_id": "user-123",
        "name": "Pizza",
        "normalized_name": "pizza",
        "created_at": "2026-10-18T12:00:00Z",
    })

    response = await client.post(
        "/favorite-dishes/",
        json={"name": "Pizza", "location_id": "location-2", "location_name": "Rand"},
    )

    assert response.status_code == 200
    assert response.json()["uuid"] == "legacy-favorite"
    assert response.json()["location_id"] == "location-2"
    assert len((await client.get("/favorite-dishes/")).json()) == 1
