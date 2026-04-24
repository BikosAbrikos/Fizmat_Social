import secrets
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, hash_password, verify_password
from app.config import settings
from app.database import get_db
from app.models import EmailVerification, User
from app.schemas import LoginRequest, RegisterRequest, SendVerificationRequest, Token, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _send_otp_email(to_email: str, code: str) -> None:
    if not settings.SMTP_HOST:
        print(f"[DEV] OTP for {to_email}: {code}", flush=True)
        return

    msg = MIMEText(
        f"Your FizMat Social verification code is: {code}\n\n"
        f"This code expires in 10 minutes. Do not share it with anyone."
    )
    msg["Subject"] = "FizMat Social — Email Verification"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as s:
        s.ehlo()
        s.starttls()
        s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        s.sendmail(settings.SMTP_FROM, [to_email], msg.as_string())


@router.post("/send-verification", status_code=status.HTTP_200_OK)
def send_verification(body: SendVerificationRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    code = f"{secrets.randbelow(1000000):06d}"

    # Replace any existing pending code for this email
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
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    verification = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.email == body.email,
            EmailVerification.code == body.code,
            EmailVerification.used.is_(False),
            EmailVerification.expires_at > datetime.utcnow(),
        )
        .first()
    )
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

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
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="This email doesn't exist")
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid password")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}
