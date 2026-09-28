import pytest


FOLLOW_DATA = {
    "from_user_id": "user-123",
    "to_user_id": "user-456",
    "is_mutual": False,
    "created_at": "2026-09-23T18:30:00",
}


@pytest.mark.asyncio
async def test_create_follow(client):
    response = await client.post(
        "/follows/",
        json=FOLLOW_DATA
    )

    assert response.status_code == 200

    data = response.json()

    assert "uuid" in data
    assert data["uuid"] is not None

    assert data["from_user_id"] == FOLLOW_DATA["from_user_id"]
    assert data["to_user_id"] == FOLLOW_DATA["to_user_id"]
    assert data["is_mutual"] == FOLLOW_DATA["is_mutual"]
    assert data["created_at"] == FOLLOW_DATA["created_at"]


@pytest.mark.asyncio
async def test_get_follows(client):
    await client.post(
        "/follows/",
        json=FOLLOW_DATA
    )

    second_follow = {
        **FOLLOW_DATA,
        "from_user_id": "user-789",
        "to_user_id": "user-123",
        "is_mutual": True,
    }

    await client.post(
        "/follows/",
        json=second_follow
    )

    response = await client.get("/follows/")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 2

    assert data[0]["from_user_id"] == "user-123"
    assert data[0]["to_user_id"] == "user-456"
    assert data[0]["is_mutual"] is False

    assert data[1]["from_user_id"] == "user-789"
    assert data[1]["to_user_id"] == "user-123"
    assert data[1]["is_mutual"] is True


@pytest.mark.asyncio
async def test_get_follow(client):
    create_response = await client.post(
        "/follows/",
        json=FOLLOW_DATA
    )

    assert create_response.status_code == 200

    follow_id = create_response.json()["uuid"]

    response = await client.get(
        f"/follows/{follow_id}"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["uuid"] == follow_id
    assert data["from_user_id"] == FOLLOW_DATA["from_user_id"]
    assert data["to_user_id"] == FOLLOW_DATA["to_user_id"]
    assert data["is_mutual"] == FOLLOW_DATA["is_mutual"]
    assert data["created_at"] == FOLLOW_DATA["created_at"]


@pytest.mark.asyncio
async def test_get_follow_not_found(client):
    response = await client.get(
        "/follows/does-not-exist"
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Follow not found"
    }


@pytest.mark.asyncio
async def test_update_follow(client):
    create_response = await client.post(
        "/follows/",
        json=FOLLOW_DATA
    )

    assert create_response.status_code == 200

    follow_id = create_response.json()["uuid"]

    update_data = {
        "from_user_id": "user-789",
        "to_user_id": "user-123",
        "is_mutual": True,
    }

    response = await client.put(
        f"/follows/{follow_id}",
        json=update_data
    )

    assert response.status_code == 200

    data = response.json()

    assert data["uuid"] == follow_id

    # Updated fields
    assert data["from_user_id"] == "user-789"
    assert data["to_user_id"] == "user-123"
    assert data["is_mutual"] is True

    # Unchanged field
    assert data["created_at"] == FOLLOW_DATA["created_at"]


@pytest.mark.asyncio
async def test_update_follow_not_found(client):
    response = await client.put(
        "/follows/does-not-exist",
        json={
            "is_mutual": True
        }
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Follow not found"
    }


@pytest.mark.asyncio
async def test_update_follow_no_fields(client):
    create_response = await client.post(
        "/follows/",
        json=FOLLOW_DATA
    )

    assert create_response.status_code == 200

    follow_id = create_response.json()["uuid"]

    response = await client.put(
        f"/follows/{follow_id}",
        json={}
    )

    assert response.status_code == 400

    assert response.json() == {
        "detail": "No fields provided for update"
    }


@pytest.mark.asyncio
async def test_delete_follow(client):
    create_response = await client.post(
        "/follows/",
        json=FOLLOW_DATA
    )

    assert create_response.status_code == 200

    follow_id = create_response.json()["uuid"]

    response = await client.delete(
        f"/follows/{follow_id}"
    )

    assert response.status_code == 200

    assert response.json() == {
        "message": "Follow deleted successfully"
    }

    # Verify it is actually gone
    get_response = await client.get(
        f"/follows/{follow_id}"
    )

    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_delete_follow_not_found(client):
    response = await client.delete(
        "/follows/does-not-exist"
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Follow not found"
    }


@pytest.mark.asyncio
async def test_create_follow_missing_from_user_id(client):
    invalid_follow = {
        **FOLLOW_DATA
    }

    del invalid_follow["from_user_id"]

    response = await client.post(
        "/follows/",
        json=invalid_follow
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_follow_missing_to_user_id(client):
    invalid_follow = {
        **FOLLOW_DATA
    }

    del invalid_follow["to_user_id"]

    response = await client.post(
        "/follows/",
        json=invalid_follow
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_follow_missing_is_mutual(client):
    invalid_follow = {
        **FOLLOW_DATA
    }

    del invalid_follow["is_mutual"]

    response = await client.post(
        "/follows/",
        json=invalid_follow
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_follow_missing_created_at(client):
    invalid_follow = {
        **FOLLOW_DATA
    }

    del invalid_follow["created_at"]

    response = await client.post(
        "/follows/",
        json=invalid_follow
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_follow_invalid_is_mutual(client):
    invalid_follow = {
        **FOLLOW_DATA,
        "is_mutual": "not-a-boolean",
    }

    response = await client.post(
        "/follows/",
        json=invalid_follow
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_follow_invalid_created_at(client):
    invalid_follow = {
        **FOLLOW_DATA,
        "created_at": "not-a-date",
    }

    response = await client.post(
        "/follows/",
        json=invalid_follow
    )

    assert response.status_code == 422