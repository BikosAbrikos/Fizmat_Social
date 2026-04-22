from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Like, Post, User
from app.schemas import PostCreate, PostOut

router = APIRouter(prefix="/api/posts", tags=["posts"])


def _serialize_post(post: Post, current_user_id: int) -> PostOut:
    liked_by_me = any(like.user_id == current_user_id for like in post.likes)
    return PostOut(
        id=post.id,
        content=post.content,
        created_at=post.created_at,
        author=post.author,
        like_count=len(post.likes),
        liked_by_me=liked_by_me,
    )


@router.get("", response_model=List[PostOut])
def get_feed(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    posts = (
        db.query(Post)
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_serialize_post(p, current_user.id) for p in posts]


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(body: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = Post(content=body.content, author_id=current_user.id)
    db.add(post)
    db.commit()
    db.refresh(post)
    return _serialize_post(post, current_user.id)


@router.post("/{post_id}/like", response_model=PostOut)
def toggle_like(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
    else:
        db.add(Like(post_id=post_id, user_id=current_user.id))
    db.commit()
    db.refresh(post)
    return _serialize_post(post, current_user.id)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id, Post.author_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found or not yours")
    db.delete(post)
    db.commit()
