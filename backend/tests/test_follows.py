import pytest


FOLLOW_DATA = {
    "from_user_id": "user-123",
    "to_user_id": "user-456",
    "is_mutual": False,
    "created_at": "2026-09-23T18:30:00",
}


# ---------------------------------------------------------------
# Create
# ---------------------------------------------------------------

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
async def test_created_follow_appears_in_list(client):
    create_response = await client.post("/follows/", json=FOLLOW_DATA)
    follow_id = create_response.json()["uuid"]

    list_response = await client.get("/follows/")

    assert follow_id in [f["uuid"] for f in list_response.json()]


# ---------------------------------------------------------------
# Read
# ---------------------------------------------------------------

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


# ---------------------------------------------------------------
# Update
# ---------------------------------------------------------------

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
async def test_update_only_is_mutual_keeps_other_fields(client):
    create_response = await client.post("/follows/", json=FOLLOW_DATA)
    follow_id = create_response.json()["uuid"]

    response = await client.put(f"/follows/{follow_id}", json={"is_mutual": True})

    assert response.status_code == 200
    data = response.json()
    assert data["is_mutual"] is True
    assert data["from_user_id"] == FOLLOW_DATA["from_user_id"]
    assert data["to_user_id"] == FOLLOW_DATA["to_user_id"]


@pytest.mark.asyncio
async def test_update_persists_in_database(client):
    create_response = await client.post("/follows/", json=FOLLOW_DATA)
    follow_id = create_response.json()["uuid"]

    await client.put(f"/follows/{follow_id}", json={"is_mutual": True})

    # Re-fetch to make sure the change was actually saved
    get_response = await client.get(f"/follows/{follow_id}")

    assert get_response.status_code == 200
    assert get_response.json()["is_mutual"] is True


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


# ---------------------------------------------------------------
# Delete
# ---------------------------------------------------------------

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
async def test_deleted_follow_not_in_list(client):
    create_response = await client.post("/follows/", json=FOLLOW_DATA)
    follow_id = create_response.json()["uuid"]

    await client.delete(f"/follows/{follow_id}")

    list_response = await client.get("/follows/")

    assert follow_id not in [f["uuid"] for f in list_response.json()]


@pytest.mark.asyncio
async def test_delete_follow_not_found(client):
    response = await client.delete(
        "/follows/does-not-exist"
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Follow not found"
    }


# ---------------------------------------------------------------
# Full flows (same sequence of calls the frontend makes)
# ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_follow_back_flow(client):
    # Ava follows you
    incoming = await client.post(
        "/follows/",
        json={
            "from_user_id": "ava",
            "to_user_id": "me",
            "is_mutual": False,
            "created_at": "2026-09-23T18:30:00",
        },
    )
    incoming_id = incoming.json()["uuid"]

    # You follow back (POST with is_mutual true, then PUT her row)
    outgoing = await client.post(
        "/follows/",
        json={
            "from_user_id": "me",
            "to_user_id": "ava",
            "is_mutual": True,
            "created_at": "2026-09-24T18:30:00",
        },
    )
    assert outgoing.status_code == 200

    put_response = await client.put(
        f"/follows/{incoming_id}", json={"is_mutual": True}
    )
    assert put_response.status_code == 200

    follows = (await client.get("/follows/")).json()

    assert len(follows) == 2
    assert all(f["is_mutual"] is True for f in follows)


@pytest.mark.asyncio
async def test_unfollow_mutual_flow(client):
    mine = await client.post(
        "/follows/",
        json={
            "from_user_id": "me",
            "to_user_id": "ava",
            "is_mutual": True,
            "created_at": "2026-09-23T18:30:00",
        },
    )
    theirs = await client.post(
        "/follows/",
        json={
            "from_user_id": "ava",
            "to_user_id": "me",
            "is_mutual": True,
            "created_at": "2026-09-24T18:30:00",
        },
    )

    my_id = mine.json()["uuid"]
    their_id = theirs.json()["uuid"]

    # You unfollow (DELETE your row, then PUT her row to not mutual)
    delete_response = await client.delete(f"/follows/{my_id}")
    assert delete_response.status_code == 200

    put_response = await client.put(
        f"/follows/{their_id}", json={"is_mutual": False}
    )
    assert put_response.status_code == 200

    follows = (await client.get("/follows/")).json()

    assert len(follows) == 1
    assert follows[0]["uuid"] == their_id
    assert follows[0]["from_user_id"] == "ava"
    assert follows[0]["is_mutual"] is False


# ---------------------------------------------------------------
# Validation
# ---------------------------------------------------------------

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