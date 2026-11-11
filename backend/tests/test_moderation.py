import pytest

from controllers.moderation import ModerationController
from main import app
from routes.moderation import get_moderation_controller


@pytest.fixture
def moderation_controller(mock_db):
    controller = ModerationController(mock_db)
    app.dependency_overrides[get_moderation_controller] = lambda: controller
    yield controller
    app.dependency_overrides.pop(get_moderation_controller, None)


@pytest.mark.asyncio
async def test_unauthenticated_request_cannot_read_moderation_queue(
    client, moderation_controller
):
    response = await client.get("/moderation/queue", headers={})

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_regular_user_cannot_read_moderation_queue(client, moderation_controller):
    response = await client.get("/moderation/queue")

    assert response.status_code == 403
    assert response.json()["detail"] == "Moderator access required"


@pytest.mark.asyncio
async def test_moderator_can_create_and_list_a_review_report(
    client, mock_db, moderation_controller
):
    await mock_db["users"].update_one(
        {"uuid": "user-123"}, {"$set": {"role": "moderator"}}
    )
    await mock_db["reviews"].insert_one(
        {"uuid": "review-1", "user_id": "user-456", "rating": 8}
    )

    created = await client.post(
        "/reports",
        json={"target_type": "review", "target_id": "review-1", "reason": " spam "},
    )

    assert created.status_code == 201
    report = created.json()
    assert report["reason"] == "spam"
    assert report["reporter_user_id"] == "user-123"

    queued = await client.get("/moderation/queue?target_type=review&reason=spam")

    assert queued.status_code == 200
    assert queued.json()["items"][0]["target"] == {
        "uuid": "review-1",
        "user_id": "user-456",
        "rating": 8,
    }


@pytest.mark.asyncio
async def test_duplicate_open_report_is_rejected(client, mock_db, moderation_controller):
    await mock_db["reviews"].insert_one({"uuid": "review-2", "rating": 7})
    payload = {"target_type": "review", "target_id": "review-2", "reason": "spam"}

    first = await client.post("/reports", json=payload)
    duplicate = await client.post("/reports", json=payload)

    assert first.status_code == 201
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "You already have an open report for this target."


@pytest.mark.asyncio
async def test_report_resolution_is_audited_and_cannot_be_repeated(
    client, mock_db, moderation_controller
):
    await mock_db["users"].update_one(
        {"uuid": "user-123"}, {"$set": {"role": "moderator"}}
    )
    await mock_db["reviews"].insert_one({"uuid": "review-3", "rating": 6})
    report = await client.post(
        "/reports",
        json={"target_type": "review", "target_id": "review-3", "reason": "spam"},
    )
    report_id = report.json()["uuid"]
    resolution = {"action": "resolved", "resolution": "Removed spam content"}

    resolved = await client.post(
        f"/moderation/reports/{report_id}/resolve", json=resolution
    )
    repeated = await client.post(
        f"/moderation/reports/{report_id}/resolve", json=resolution
    )

    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"
    assert resolved.json()["history"][0]["action"] == "resolved"
    assert repeated.status_code == 409


@pytest.mark.asyncio
async def test_moderator_hide_action_updates_review_and_audit(
    client, mock_db, moderation_controller
):
    await mock_db["users"].update_one(
        {"uuid": "user-123"}, {"$set": {"role": "moderator"}}
    )
    await mock_db["reviews"].insert_one({"uuid": "review-4", "rating": 9})

    hidden = await client.post(
        "/moderation/reviews/review-4/hide", json={"reason": "policy violation"}
    )

    assert hidden.status_code == 200
    assert hidden.json()["visibility"] == "hidden"
    audit = await mock_db["moderation_audit"].find_one(
        {"target_id": "review-4"}, {"_id": 0}
    )
    assert audit["action"] == "hide_review"
    assert audit["actor_user_id"] == "user-123"


@pytest.mark.asyncio
async def test_admin_only_suspension_updates_account_and_token_version(
    client, mock_db, moderation_controller
):
    denied = await client.post(
        "/moderation/accounts/user-456/suspend", json={"reason": "abuse"}
    )
    assert denied.status_code == 403

    await mock_db["users"].update_one(
        {"uuid": "user-123"}, {"$set": {"role": "admin"}}
    )
    suspended = await client.post(
        "/moderation/accounts/user-456/suspend",
        json={"reason": "abuse", "appeal_notes": "Contact support"},
    )

    assert suspended.status_code == 200
    assert suspended.json()["status"] == "suspended"
    assert suspended.json()["security_version"] == 1
    assert suspended.json()["appeal_notes"] == "Contact support"

    unsuspended = await client.post(
        "/moderation/accounts/user-456/unsuspend", json={"reason": "appeal accepted"}
    )

    assert unsuspended.status_code == 200
    assert unsuspended.json()["status"] == "active"
    assert unsuspended.json()["security_version"] == 2
    assert "suspended_until" not in unsuspended.json()


@pytest.mark.asyncio
async def test_last_administrator_cannot_be_suspended(client, mock_db, moderation_controller):
    await mock_db["users"].update_one(
        {"uuid": "user-123"}, {"$set": {"role": "admin"}}
    )

    response = await client.post(
        "/moderation/accounts/user-123/suspend", json={"reason": "self action"}
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "The last administrator cannot be suspended."
