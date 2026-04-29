import secrets
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText

import resend
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, hash_password, verify_password
from app.config import settings
from app.database import get_db
from app.models import EmailVerification, User
from app.schemas import LoginRequest, RegisterRequest, SendVerificationRequest, Token, UserOut
from app.security import limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])

MAX_OTP_ATTEMPTS = 5


def _send_otp_email(to_email: str, code: str) -> None:
    # Dev fallback — no email service configured
    if not settings.RESEND_API_KEY and not settings.SMTP_HOST:
        print(f"[DEV] OTP for {to_email}: {code}", flush=True)
        return

    if settings.RESEND_API_KEY:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.RESEND_FROM,
            "to": [to_email],
            "subject": "FizMat Social — Email Verification",
            "text": (
                f"Your FizMat Social verification code is: {code}\n\n"
                f"This code expires in 10 minutes. Do not share it with anyone."
            ),
        })
        return

    # SMTP fallback (local dev with real SMTP)
    msg = MIMEText(
        f"Your FizMat Social verification code is: {code}\n\n"
        f"This code expires in 10 minutes. Do not share it with anyone."
    )
    msg["Subject"] = "FizMat Social — Email Verification"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email

    # Resolve to IPv4 explicitly — avoids ENETUNREACH on hosts without IPv6 routing
    import socket
    ipv4 = socket.getaddrinfo(settings.SMTP_HOST, settings.SMTP_PORT, socket.AF_INET)[0][4][0]

    with smtplib.SMTP(ipv4, settings.SMTP_PORT, timeout=10) as s:
        s.ehlo(settings.SMTP_HOST)
        s.starttls()
        s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        s.sendmail(settings.SMTP_FROM, [to_email], msg.as_string())


@router.post("/send-verification", status_code=status.HTTP_200_OK)
@limiter.limit("3/hour")
def send_verification(request: Request, body: SendVerificationRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    code = f"{secrets.randbelow(1000000):06d}"

    db.query(EmailVerification).filter(EmailVerification.email == body.email).delete()
    db.add(EmailVerification(
        email=body.email,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    ))
    db.commit()

    try:
        _send_otp_email(body.email, code)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {exc}")

    return {"message": "Verification code sent"}


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    verification = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.email == body.email,
            EmailVerification.used.is_(False),
            EmailVerification.expires_at > datetime.utcnow(),
        )
        .first()
    )

    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    # Check attempt limit before verifying code
    if verification.attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Too many incorrect attempts. Request a new code.")

    if verification.code != body.code:
        verification.attempts += 1
        db.commit()
        remaining = MAX_OTP_ATTEMPTS - verification.attempts
        if remaining <= 0:
            raise HTTPException(status_code=400, detail="Too many incorrect attempts. Request a new code.")
        raise HTTPException(status_code=400, detail=f"Invalid verification code. {remaining} attempt(s) left.")

    verification.used = True

    user = User(
        name=body.name,
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    # Use the same generic error for both "email not found" and "wrong password"
    # to prevent attackers from discovering which emails are registered.
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}
