from fastapi.testclient import TestClient

from main import app


def test_http_responses_include_security_headers_without_hsts() -> None:
    response = TestClient(app).get("/")

    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Content-Security-Policy"] == "frame-ancestors 'none'"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert "Strict-Transport-Security" not in response.headers


def test_https_responses_include_hsts() -> None:
    response = TestClient(app, base_url="https://testserver").get("/")

    assert response.headers["Strict-Transport-Security"] == "max-age=31536000"
