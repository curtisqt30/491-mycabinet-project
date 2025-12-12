import os
from logging import getLogger
from typing import Literal, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

log = getLogger(__name__)

# Resend configuration (primary - works on Railway)
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_API_URL = "https://api.resend.com/emails"

# Email settings
MAIL_FROM = os.getenv("MAIL_FROM", "MyCabinet <no-reply@mycabinet.me>")
REPLY_TO = os.getenv("REPLY_TO")


def _require_api_key():
    if not RESEND_API_KEY:
        raise RuntimeError(
            "RESEND_API_KEY not set. Add it to Railway environment variables."
        )


def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> None:
    """Send email via Resend HTTP API (works on Railway, no SMTP needed)."""
    _require_api_key()

    payload = {
        "from": MAIL_FROM,
        "to": [to],
        "subject": subject,
        "html": html,
    }

    if text:
        payload["text"] = text

    if REPLY_TO:
        payload["reply_to"] = REPLY_TO

    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(RESEND_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            log.info("Email sent successfully to %s via Resend", to)
    except httpx.HTTPStatusError as e:
        log.error("Resend API error: %s - %s", e.response.status_code, e.response.text)
        raise RuntimeError(f"Email send failed: {e.response.text}")
    except httpx.RequestError as e:
        log.error("Resend request failed: %s", e)
        raise RuntimeError(f"Email send failed: {e}")


# ---- Shared code template ----
def _format_code_for_html(code: str) -> str:
    """Format OTP code with spacing for readability."""
    c = "".join(ch for ch in code if ch.isdigit())
    if len(c) == 6:
        return f"{c[:3]}&nbsp;&nbsp;{c[3:]}"
    if len(c) == 8:
        return f"{c[:4]}&nbsp;&nbsp;{c[4:]}"
    return c


def send_code(to: str, subject: str, code: str) -> None:
    """
    Generic code sender used by all intents (login/verify/reset/delete).
    """
    safe_code_html = _format_code_for_html(code)
    html = f"""
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.45">
      <h2 style="margin:0 0 12px 0">{subject}</h2>
      <p style="margin:0 0 12px 0">Enter this code in the app. It expires in a few minutes.</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0 16px 0">
        {safe_code_html}
      </div>
      <p style="color:#666;font-size:12px;margin:12px 0 0 0">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    """
    text = (
        f"{subject}\n"
        f"Your code: {code}\n"
        "If you didn't request this, ignore this email."
    )
    send_email(to, subject, html, text)


# ---- Intent-specific wrappers ----
Intent = Literal["login", "verify", "reset", "delete"]

SUBJECTS: dict[Intent, str] = {
    "login": "Your MyCabinet code",
    "verify": "Verify your email — code",
    "reset": "Reset code",
    "delete": "Confirm deletion code",
}


def send_login_code(to: str, code: str) -> None:
    send_code(to, SUBJECTS["login"], code)


def send_verify_code(to: str, code: str) -> None:
    send_code(to, SUBJECTS["verify"], code)


def send_reset_code(to: str, code: str) -> None:
    send_code(to, SUBJECTS["reset"], code)


def send_delete_code(to: str, code: str) -> None:
    send_code(to, SUBJECTS["delete"], code)


# ---- Notify after a successful change ----
def send_password_changed_notice(to: str) -> None:
    subject = "MyCabinet: Your password was changed"
    html = """
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.45">
      <h2 style="margin:0 0 12px 0">Password changed</h2>
      <p style="margin:0">Your MyCabinet password was just changed.
      If this wasn't you, reset it immediately.</p>
    </div>
    """
    text = (
        "Your MyCabinet password was changed. If this wasn't you, reset it immediately."
    )
    send_email(to, subject, html, text)


def send_account_deleted_notice(to: str) -> None:
    """Send a confirmation email when an account is deleted."""
    subject = "MyCabinet: Your account has been deleted"
    html = """
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.45">
      <h2 style="margin:0 0 12px 0">Account Deleted</h2>
      <p style="margin:0 0 12px 0">Your MyCabinet account has been permanently deleted.</p>
      <p style="margin:0 0 12px 0">All your data has been removed from our servers.</p>
      <p style="color:#666;font-size:12px;margin:12px 0 0 0">
        If you didn't request this, please contact support immediately.
      </p>
    </div>
    """
    text = (
        "Your MyCabinet account has been deleted.\n"
        "All your data has been removed.\n"
        "If you didn't request this, please contact support."
    )
    send_email(to, subject, html, text)
