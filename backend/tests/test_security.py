import pytest
import jwt
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from app.core.security import get_current_user_email, WHITELIST_EMAILS

# Use a name not starting with 'test_' to prevent Pytest collection warnings
app = FastAPI()


@app.get("/test-protected")
def protected_route(email: str = Depends(get_current_user_email)) -> dict:
    return {"email": email}


client = TestClient(app)


def test_security_dependency_whitelisted(monkeypatch) -> None:
    """
    Test that whitelisted emails are permitted access.
    """
    whitelisted_email = WHITELIST_EMAILS[0]
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "testsecret")

    def mock_decode(*args, **kwargs):
        return {"email": whitelisted_email}

    monkeypatch.setattr(jwt, "decode", mock_decode)

    response = client.get(
        "/test-protected", headers={"Authorization": "Bearer validtoken"}
    )
    assert response.status_code == 200
    assert response.json() == {"email": whitelisted_email}


def test_security_dependency_not_whitelisted(monkeypatch) -> None:
    """
    Test that non-whitelisted emails are rejected with 403 Forbidden.
    """
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "testsecret")

    def mock_decode(*args, **kwargs):
        return {"email": "stranger@example.com"}

    monkeypatch.setattr(jwt, "decode", mock_decode)

    response = client.get(
        "/test-protected", headers={"Authorization": "Bearer validtoken"}
    )
    assert response.status_code == 403
    assert "whitelist" in response.json()["detail"].lower()


def test_security_dependency_missing_token() -> None:
    """
    Test that requests missing the Authorization header are blocked with 401.
    """
    response = client.get("/test-protected")
    assert response.status_code == 401
    assert "not authenticated" in response.json()["detail"].lower()
