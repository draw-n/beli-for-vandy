"""Sanitized structured logging for authentication and authorization failures."""

import hashlib
import json
import logging

from fastapi import Request


_security_logger = logging.getLogger("beli.security")


def log_security_failure(request: Request, status_code: int) -> None:
    event = {
        "event": (
            "authentication_failure"
            if status_code == 401
            else "authorization_failure"
        ),
        "method": request.method,
        "path": request.url.path,
        "status_code": status_code,
    }
    if request.client is not None:
        event["client_id"] = hashlib.sha256(
            request.client.host.encode("utf-8")
        ).hexdigest()

    _security_logger.warning(
        "%s",
        json.dumps(event, sort_keys=True, separators=(",", ":")),
    )
