import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator, model_validator


# ── Auth ──────────────────────────────────────────────────────────────────────

class SendVerificationRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def email_must_be_fizmat(cls, v: str) -> str:
        if not v.lower().endswith("@fizmat.kz"):
            raise ValueError("Only @fizmat.kz emails are allowed")
        return v.lower()


class RegisterRequest(BaseModel):
    email: EmailStr
    code: str
    name: str
    username: str
    password: str
    confirm_password: str

    @field_validator("email")
    @classmethod
    def email_must_be_fizmat(cls, v: str) -> str:
        if not v.lower().endswith("@fizmat.kz"):
            raise ValueError("Only @fizmat.kz emails are allowed")
        return v.lower()

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 30:
            raise ValueError("Username must be at most 30 characters")
        if not re.match(r'^[a-z0-9._]+$', v):
            raise ValueError("Username can only contain letters, numbers, dots, and underscores")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── User ──────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    name: str
    username: Optional[str]
    email: str
    avatar_url: Optional[str]
    age: Optional[int]
    grade: Optional[str]
    bio: Optional[str]
    future_major: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    age: Optional[int] = None
    grade: Optional[str] = None
    bio: Optional[str] = None
    future_major: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty")
        return v

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            if len(v) < 3:
                raise ValueError("Username must be at least 3 characters")
            if len(v) > 30:
                raise ValueError("Username must be at most 30 characters")
            if not re.match(r'^[a-z0-9._]+$', v):
                raise ValueError("Username can only contain letters, numbers, dots, and underscores")
        return v


# ── Friends ───────────────────────────────────────────────────────────────────

class FriendRequestOut(BaseModel):
    id: int
    sender: "UserOut"
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FriendStatusOut(BaseModel):
    status: str  # none | pending_sent | pending_received | friends
    request_id: Optional[int] = None


# ── Post ──────────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Post content cannot be empty")
        return v


class PostOut(BaseModel):
    id: int
    content: str
    created_at: datetime
    author: UserOut
    like_count: int
    liked_by_me: bool

    model_config = {"from_attributes": True}
