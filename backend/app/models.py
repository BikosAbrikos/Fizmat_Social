from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    age = Column(Integer, nullable=True)
    grade = Column(String(10), nullable=True)
    bio = Column(String(150), nullable=True)
    future_major = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    sent_requests = relationship("FriendRequest", foreign_keys="FriendRequest.sender_id", back_populates="sender", cascade="all, delete-orphan")
    received_requests = relationship("FriendRequest", foreign_keys="FriendRequest.receiver_id", back_populates="receiver", cascade="all, delete-orphan")
    blocks_given = relationship("Block", foreign_keys="Block.blocker_id", back_populates="blocker", cascade="all, delete-orphan")
    blocks_received = relationship("Block", foreign_keys="Block.blocked_id", back_populates="blocked_user", cascade="all, delete-orphan")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=True)
    content = Column(Text, nullable=True)
    link_url = Column(String(500), nullable=True)
    media_url = Column(String(1000), nullable=True)
    media_type = Column(String(10), nullable=True)  # "image" or "video"
    community_id = Column(Integer, ForeignKey("communities.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    author = relationship("User", back_populates="posts")
    community = relationship("Community", foreign_keys=[community_id])
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="likes")
    post = relationship("Post", back_populates="likes")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    parent_comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")
    replies = relationship("Comment", back_populates="parent", cascade="all, delete-orphan")
    parent = relationship("Comment", back_populates="replies", remote_side=[id])


class FriendRequest(Base):
    __tablename__ = "friend_requests"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_requests")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_requests")


class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    read = Column(Boolean, default=False, nullable=False)

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    endpoint = Column(Text, nullable=False, unique=True)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    code = Column(String(6), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)


class Community(Base):
    __tablename__ = "communities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(300), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_private = Column(Boolean, default=False, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", foreign_keys=[owner_id])
    members = relationship("CommunityMember", back_populates="community", cascade="all, delete-orphan")
    join_requests = relationship("CommunityJoinRequest", back_populates="community", cascade="all, delete-orphan")


class CommunityMember(Base):
    __tablename__ = "community_members"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), default="member", nullable=False)  # owner/moderator/member
    joined_at = Column(DateTime, default=datetime.utcnow)

    community = relationship("Community", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])


class CommunityJoinRequest(Base):
    __tablename__ = "community_join_requests"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="pending", nullable=False)  # pending/accepted/rejected
    created_at = Column(DateTime, default=datetime.utcnow)

    community = relationship("Community", back_populates="join_requests")
    user = relationship("User", foreign_keys=[user_id])


class Block(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)
    blocker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    blocked_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    blocker = relationship("User", foreign_keys=[blocker_id], back_populates="blocks_given")
    blocked_user = relationship("User", foreign_keys=[blocked_id], back_populates="blocks_received")


class SeenPost(Base):
    __tablename__ = "seen_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    seen_at = Column(DateTime, default=datetime.utcnow)


class SavedPost(Base):
    __tablename__ = "saved_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    saved_at = Column(DateTime, default=datetime.utcnow)
