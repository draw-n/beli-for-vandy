import json
import logging

import pytest

from controllers.auth import issue_access_token
from http import HTTPStatus


TEST_TOKEN_SECRET = "backend-test-secret-with-sufficient-entropy"


@pytest.mark.asyncio
async def test_authentication_and_authorization_failures_log_sanitized_events(
    client,
    caplog,
) -> None:
    caplog.set_level(logging.WARNING, logger="beli.security")
    bearer_token = "do-not-log-this-bearer-token"
    password = "do-not-log-this-password"

    unauthenticated = await client.post(
        "/accounts/logout",
        headers={"Authorization": f"Bearer {bearer_token}"},
        json={"password": password},
    )
    token, _ = issue_access_token("user-123", TEST_TOKEN_SECRET)
    forbidden = await client.get(
        "/accounts",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert unauthenticated.status_code == HTTPStatus.UNAUTHORIZED
    assert forbidden.status_code == HTTPStatus.FORBIDDEN

    events = [
        json.loads(record.getMessage())
        for record in caplog.records
        if record.name == "beli.security"
    ]
    assert [event["event"] for event in events] == [
        "authentication_failure",
        "authorization_failure",
    ]
    assert [event["status_code"] for event in events] == [401, 403]
    log_output = "\n".join(record.getMessage() for record in caplog.records)
    assert bearer_token not in log_output
    assert password not in log_output
