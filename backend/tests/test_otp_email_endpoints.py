from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.main import app
from app.models.auth_token import AuthToken
from app.models.user import User
from app.services import token_service


@pytest.fixture
def db_session() -> Session:
    """Provide a database session for tests."""
    db = SessionLocal()
    try:
        yield db
    finally:
        # Clean up any auth tokens created during tests
        db.query(AuthToken).delete()
        db.commit()
        db.rollback()
        db.close()


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user in the database."""
    # Clean up any existing test user first
    existing = (
        db_session.query(User).filter(User.email == "test_otp@example.com").first()
    )
    if existing:
        db_session.delete(existing)
        db_session.commit()

    user = User(
        email="test_otp@example.com",
        hashed_password=hash_password("TestPass123!"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    yield user

    # Cleanup after test
    db_session.delete(user)
    db_session.commit()


@pytest_asyncio.fixture
async def async_client() -> AsyncClient:
    """Create an async client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# ===== OTP Request Tests =====


@pytest.mark.asyncio
@patch("app.services.mail_services.send_email")
async def test_request_otp_login(
    mock_send_email, async_client: AsyncClient, db_session: Session
):
    """Test requesting OTP for login intent."""
    mock_send_email.return_value = None

    resp = await async_client.post(
        "/api/v1/auth/otp/request",
        json={"email": "test@example.com", "intent": "login"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True

    # Verify OTP was created in database
    otp_record = (
        db_session.query(AuthToken)
        .filter(
            AuthToken.email == "test@example.com",
            AuthToken.purpose == "login_otp",
        )
        .first()
    )
    assert otp_record is not None


@pytest.mark.asyncio
@patch("app.services.mail_services.send_email")
async def test_request_otp_verify(
    mock_send_email, async_client: AsyncClient, db_session: Session
):
    """Test requesting OTP for verify intent."""
    mock_send_email.return_value = None

    resp = await async_client.post(
        "/api/v1/auth/otp/request",
        json={"email": "test@example.com", "intent": "verify"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True


@pytest.mark.asyncio
@patch("app.services.mail_services.send_email")
async def test_request_otp_reset(
    mock_send_email, async_client: AsyncClient, db_session: Session
):
    """Test requesting OTP for password reset intent."""
    mock_send_email.return_value = None

    resp = await async_client.post(
        "/api/v1/auth/otp/request",
        json={"email": "test@example.com", "intent": "reset"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True


@pytest.mark.asyncio
@patch("app.services.mail_services.send_email")
async def test_request_otp_delete(
    mock_send_email, async_client: AsyncClient, db_session: Session
):
    """Test requesting OTP for account deletion intent."""
    mock_send_email.return_value = None

    resp = await async_client.post(
        "/api/v1/auth/otp/request",
        json={"email": "test@example.com", "intent": "delete"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True


@pytest.mark.asyncio
async def test_request_otp_invalid_intent(async_client: AsyncClient):
    """Test requesting OTP with invalid intent."""
    resp = await async_client.post(
        "/api/v1/auth/otp/request",
        json={"email": "test@example.com", "intent": "invalid"},
    )
    assert resp.status_code == 422  # Validation error


@pytest.mark.asyncio
@patch("app.services.mail_services.send_email")
async def test_request_otp_rate_limiting(
    mock_send_email, async_client: AsyncClient, db_session: Session
):
    """Test OTP request rate limiting (10 per 24h)."""
    mock_send_email.return_value = None

    # Request OTP 3 times (should succeed)
    for i in range(10):
        resp = await async_client.post(
            "/api/v1/auth/otp/request",
            json={"email": "ratelimit@example.com", "intent": "verify"},
        )
        assert resp.status_code == 200

    # 4th request should still return 200 but not send email (soft-fail)
    resp = await async_client.post(
        "/api/v1/auth/otp/request",
        json={"email": "ratelimit@example.com", "intent": "verify"},
    )
    assert resp.status_code == 200

    # Verify only 3 OTPs were created
    otp_count = (
        db_session.query(AuthToken)
        .filter(
            AuthToken.email == "ratelimit@example.com",
        )
        .count()
    )
    assert otp_count == 10


# ===== OTP Verify Tests =====


@pytest.mark.asyncio
@patch("app.services.mail_services.send_email")
async def test_verify_otp_success(
    mock_send_email, async_client: AsyncClient, db_session: Session
):
    """Test successful OTP verification."""
    mock_send_email.return_value = None

    # First request OTP
    resp = await async_client.post(
        "/api/v1/auth/otp/request",
        json={"email": "verify@example.com", "intent": "verify"},
    )
    assert resp.status_code == 200

    # Get the OTP from database (for testing only)
    otp_code, _ = token_service.create_otp(
        db_session, email="verify@example.com", purpose="verify_otp", ttl_minutes=10
    )

    # Verify the OTP
    resp = await async_client.post(
        "/api/v1/auth/otp/verify",
        json={
            "email": "verify@example.com",
            "intent": "verify",
            "code": otp_code,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert "token" in data


@pytest.mark.asyncio
async def test_verify_otp_invalid_code(async_client: AsyncClient, db_session: Session):
    """Test OTP verification with invalid code."""
    # Create an OTP
    token_service.create_otp(
        db_session, email="invalid@example.com", purpose="verify_otp", ttl_minutes=10
    )

    # Try to verify with wrong code
    resp = await async_client.post(
        "/api/v1/auth/otp/verify",
        json={
            "email": "invalid@example.com",
            "intent": "verify",
            "code": "999999",
        },
    )
    assert resp.status_code == 400
    assert "invalid" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_verify_otp_expired(async_client: AsyncClient, db_session: Session):
    """Test OTP verification with expired code."""
    # Create an OTP with 0 minute TTL (instantly expired)
    otp_code, _ = token_service.create_otp(
        db_session, email="expired@example.com", purpose="verify_otp", ttl_minutes=0
    )

    # Try to verify expired OTP
    resp = await async_client.post(
        "/api/v1/auth/otp/verify",
        json={
            "email": "expired@example.com",
            "intent": "verify",
            "code": otp_code,
        },
    )
    assert resp.status_code == 400


# ===== Password Reset Tests =====


@pytest.mark.asyncio
@patch("app.services.mail_services.send_email")
async def test_reset_complete_success(
    mock_send_email, async_client: AsyncClient, db_session: Session, test_user: User
):
    """Test successful password reset completion."""
    mock_send_email.return_value = None

    # Create reset OTP
    otp_code, _ = token_service.create_otp(
        db_session, email=test_user.email, purpose="reset_otp", ttl_minutes=10
    )

    # Complete password reset
    resp = await async_client.post(
        "/api/v1/auth/reset/complete",
        json={
            "email": test_user.email,
            "code": otp_code,
            "new_password": "NewSecurePass123!",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True

    # Verify password was changed by trying to login
    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "NewSecurePass123!"},
    )
    assert login_resp.status_code == 200


@pytest.mark.asyncio
async def test_reset_complete_invalid_code(async_client: AsyncClient, test_user: User):
    """Test password reset with invalid code."""
    resp = await async_client.post(
        "/api/v1/auth/reset/complete",
        json={
            "email": test_user.email,
            "code": "999999",
            "new_password": "NewSecurePass123!",
        },
    )
    assert resp.status_code == 400
    assert "invalid" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_reset_complete_nonexistent_user(
    async_client: AsyncClient, db_session: Session
):
    """Test password reset for non-existent user."""
    # Create OTP for non-existent user
    otp_code, _ = token_service.create_otp(
        db_session, email="nonexistent@example.com", purpose="reset_otp", ttl_minutes=10
    )

    resp = await async_client.post(
        "/api/v1/auth/reset/complete",
        json={
            "email": "nonexistent@example.com",
            "code": otp_code,
            "new_password": "NewSecurePass123!",
        },
    )
    assert resp.status_code == 400
    assert "not found" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_reset_complete_weak_password(
    async_client: AsyncClient, db_session: Session, test_user: User
):
    """Test password reset with weak new password."""
    # Create reset OTP
    otp_code, _ = token_service.create_otp(
        db_session, email=test_user.email, purpose="reset_otp", ttl_minutes=10
    )

    resp = await async_client.post(
        "/api/v1/auth/reset/complete",
        json={
            "email": test_user.email,
            "code": otp_code,
            "new_password": "weak",
        },
    )
    assert resp.status_code == 422  # Validation error


# ===== Debug Endpoint Tests =====


@pytest.mark.asyncio
async def test_debug_otp_with_header(async_client: AsyncClient):
    """Test debug OTP endpoint with correct header."""
    resp = await async_client.post(
        "/api/v1/auth/otp/request/debug",
        json={"email": "debug@example.com", "intent": "verify"},
        headers={"X-Debug-OTP": "true"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert "code" in data  # Debug endpoint returns the code


@pytest.mark.asyncio
async def test_debug_otp_without_header(async_client: AsyncClient):
    """Test debug OTP endpoint without header (should fail)."""
    resp = await async_client.post(
        "/api/v1/auth/otp/request/debug",
        json={"email": "debug@example.com", "intent": "verify"},
    )
    assert resp.status_code == 403
    assert "forbidden" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_debug_otp_wrong_header(async_client: AsyncClient):
    """Test debug OTP endpoint with wrong header value."""
    resp = await async_client.post(
        "/api/v1/auth/otp/request/debug",
        json={"email": "debug@example.com", "intent": "verify"},
        headers={"X-Debug-OTP": "false"},
    )
    assert resp.status_code == 403


# ===== Email Service Tests =====


@pytest.mark.asyncio
@patch("app.services.mail_services.send_email")
async def test_email_sent_on_otp_request(mock_send_email, async_client: AsyncClient):
    """Test that email is actually sent when OTP is requested."""
    mock_send_email.return_value = None

    await async_client.post(
        "/api/v1/auth/otp/request",
        json={"email": "emailtest@example.com", "intent": "verify"},
    )

    # Verify send_email was called
    mock_send_email.assert_called_once()
    call_args = mock_send_email.call_args[0]
    assert call_args[0] == "emailtest@example.com"  # to email
    assert "code" in call_args[1].lower()  # subject contains "code"


@pytest.mark.asyncio
@patch("app.services.mail_services.send_email")
async def test_different_email_subjects_per_intent(
    mock_send_email, async_client: AsyncClient
):
    """Test that different intents generate different email subjects."""
    mock_send_email.return_value = None

    intents = ["login", "verify", "reset", "delete"]
    subjects = []

    for intent in intents:
        mock_send_email.reset_mock()
        await async_client.post(
            "/api/v1/auth/otp/request",
            json={"email": f"{intent}@example.com", "intent": intent},
        )
        if mock_send_email.called:
            subjects.append(mock_send_email.call_args[0][1])

    # Verify we got different subjects for different intents
    assert len(set(subjects)) > 1  # At least some subjects should be different
