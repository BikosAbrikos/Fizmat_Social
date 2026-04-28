from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload, subqueryload

from app.auth import get_current_user
from app.database import get_db
from app.models import FriendRequest, Post, User
from app.schemas import PostOut, UserOut, UserPublicOut, UserUpdate
from app.security import limiter

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(body: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.name is not None:
        current_user.name = body.name
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    if body.username is not None:
        taken = db.query(User).filter(User.username == body.username, User.id != current_user.id).first()
        if taken:
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = body.username
    if body.age is not None:
        current_user.age = body.age
    if body.grade is not None:
        current_user.grade = body.grade
    if body.bio is not None:
        current_user.bio = body.bio
    if body.future_major is not None:
        current_user.future_major = body.future_major
    if body.smart_feed is not None:
        current_user.smart_feed = body.smart_feed
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/search", response_model=list[UserPublicOut])
@limiter.limit("30/minute")
def search_users(request: Request, q: str = "", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if len(q.strip()) < 2:
        return []
    term = q.strip().lstrip("@")
    return db.query(User).filter(
        User.username.ilike(f"%{term}%"),
        User.id != current_user.id,
    ).limit(10).all()


@router.get("/{user_id}/posts", response_model=List[PostOut])
def get_user_posts(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.routers.posts import _serialize_post
    from app.schemas import CommunityBrief

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    posts = (
        db.query(Post)
        .options(
            joinedload(Post.author),
            subqueryload(Post.likes),
            subqueryload(Post.comments),
            joinedload(Post.community),
        )
        .filter(Post.author_id == user_id)
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_serialize_post(p, current_user.id) for p in posts]


@router.get("/{user_id}/friends", response_model=List[UserPublicOut])
def get_user_friends(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    accepted = db.query(FriendRequest).filter(
        ((FriendRequest.sender_id == user_id) | (FriendRequest.receiver_id == user_id)),
        FriendRequest.status == "accepted",
    ).all()

    friend_ids = [
        r.receiver_id if r.sender_id == user_id else r.sender_id
        for r in accepted
    ]
    if not friend_ids:
        return []
    return db.query(User).filter(User.id.in_(friend_ids)).all()


@router.get("/{user_id}", response_model=UserPublicOut)
def get_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
