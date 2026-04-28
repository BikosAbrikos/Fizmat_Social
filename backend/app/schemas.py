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


# ── Messages ──────────────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        return v


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UnreadChatOut(BaseModel):
    sender: "UserOut"
    count: int
    last_message: str
    last_at: datetime

    model_config = {"from_attributes": True}


# ── Post ──────────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    title: str
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    link_url: Optional[str] = None
    community_id: Optional[int] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty")
        if len(v) > 300:
            raise ValueError("Title must be at most 300 characters")
        return v


class PostOut(BaseModel):
    id: int
    title: Optional[str]
    content: Optional[str]
    link_url: Optional[str]
    media_url: Optional[str]
    media_type: Optional[str]
    created_at: datetime
    author: UserOut
    like_count: int
    liked_by_me: bool
    comment_count: int = 0  # default 0 for backward compatibility
    community: Optional["CommunityBrief"] = None

    model_config = {"from_attributes": True}


# ── Community ─────────────────────────────────────────────────────────────────

class CommunityCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_private: bool = False

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Community name must be at least 3 characters")
        if len(v) > 50:
            raise ValueError("Community name must be at most 50 characters")
        if not re.match(r'^[a-zA-Z0-9 _-]+$', v):
            raise ValueError("Name can only contain letters, numbers, spaces, hyphens, and underscores")
        return v

    @field_validator("description")
    @classmethod
    def description_max(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 300:
            raise ValueError("Description must be at most 300 characters")
        return v


class CommunityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    is_private: Optional[bool] = None


class CommunityBrief(BaseModel):
    id: int
    name: str
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class CommunityOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    avatar_url: Optional[str]
    is_private: bool
    owner_id: int
    created_at: datetime
    member_count: int
    my_role: Optional[str]  # owner/moderator/member/pending/None

    model_config = {"from_attributes": True}


class CommunityMemberOut(BaseModel):
    id: int
    user: UserOut
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class JoinRequestOut(BaseModel):
    id: int
    user: UserOut
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Comment ───────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str
    parent_comment_id: Optional[int] = None

    @field_validator("content")
    @classmethod
    def content_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Comment cannot be empty")
        if len(v) > 1000:
            raise ValueError("Comment must be at most 1000 characters")
        return v


class CommentOut(BaseModel):
    id: int
    content: str
    created_at: datetime
    author: UserOut
    parent_comment_id: Optional[int] = None

    model_config = {"from_attributes": True}
