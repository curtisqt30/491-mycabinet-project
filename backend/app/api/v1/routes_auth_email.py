from logging import getLogger

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import hash_password
from app.models.user import User
from app.schemas.otp import OTPRequestIn, OTPVerifyIn, ResetCompleteIn
from app.services import mail_services, token_service

log = getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth:otp"])

# Map external "intent" -> internal token_service purpose
PURPOSE_MAP = {
    "login": "login_otp",
    "verify": "verify_otp",
    "reset": "reset_otp",
    "delete": "delete_otp",
}

DAILY_LIMIT = 10 


def _send_intent_email(intent: str, email: str, code: str) -> None:
    if intent == "login":
        mail_services.send_login_code(email, code)
    elif intent == "verify":
        mail_services.send_verify_code(email, code)
    elif intent == "reset":
        mail_services.send_reset_code(email, code)
    elif intent == "delete":
        mail_services.send_delete_code(email, code)


@router.post("/otp/request", status_code=200)
def request_otp(data: OTPRequestIn, db: Session = Depends(get_db)):
    """
    Issue an OTP for {login|verify|reset|delete}. Always 200 to avoid enumeration.
    Enforces a simple 24h send cap using token_service.count_recent(...).
    """
    email = data.email.strip().lower()
    purpose = PURPOSE_MAP.get(data.intent)
    if not purpose:
        raise HTTPException(status_code=400, detail="Unsupported intent")

    try:
        sent_24h = token_service.count_recent(db, email, purpose, hours=24)
    except Exception:
        sent_24h = 0  # fail open on DB issues

    if sent_24h >= DAILY_LIMIT:
        return {"ok": True}  # soft-fail, still 200

    code, _rec = token_service.create_otp(
        db, email=email, purpose=purpose, ttl_minutes=10
    )
    try:
        _send_intent_email(data.intent, email, code)
    except Exception:
        # Log and still return 200 to avoid user enumeration / dev friction
        log.exception("OTP email send failed for %s intent=%s", email, data.intent)

    return {"ok": True}


@router.post("/otp/verify")
def verify_otp(data: OTPVerifyIn, db: Session = Depends(get_db)):
    """
    Verify a submitted code for the given intent.
    """
    email = data.email.strip().lower()
    purpose = PURPOSE_MAP[data.intent]

    ok = token_service.verify_otp(db, email=email, purpose=purpose, otp=data.code)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code"
        )

    # TODO: return real JWTs
    return {"ok": True, "token": "dev-session-token"}


@router.post("/reset/complete")
def reset_complete(data: ResetCompleteIn, db: Session = Depends(get_db)):
    """
    Complete password reset after validating the OTP.
    """
    email = data.email.strip().lower()
    purpose = PURPOSE_MAP["reset"]

    if not token_service.verify_otp(db, email=email, purpose=purpose, otp=data.code):
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Account not found")

    user.hashed_password = hash_password(data.new_password)
    db.add(user)
    db.commit()
    mail_services.send_password_changed_notice(email)
    return {"ok": True}


@router.post("/otp/request/debug", status_code=200)
def request_otp_debug(
    data: OTPRequestIn,
    db: Session = Depends(get_db),
    x_debug_otp: str | None = Header(None),  # simple guard for dev
):
    if x_debug_otp != "true":
        raise HTTPException(status_code=403, detail="Forbidden")
    email = data.email.strip().lower()
    purpose = PURPOSE_MAP[data.intent]

    try:
        code, _rec = token_service.create_otp(
            db, email=email, purpose=purpose, ttl_minutes=10
        )
        # DO NOT send email here
        return {"ok": True, "code": code}  # DEV ONLY
    except Exception as e:
        log.exception("debug create_otp failed: %s", e)
        raise HTTPException(status_code=500, detail="debug otp failure")