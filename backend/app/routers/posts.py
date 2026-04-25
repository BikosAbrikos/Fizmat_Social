from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Like, Post, User
from app.schemas import PostCreate, PostOut

router = APIRouter(prefix="/api/posts", tags=["posts"])


def _serialize_post(post: Post, current_user_id: int) -> PostOut:
    liked_by_me = any(like.user_id == current_user_id for like in post.likes)
    return PostOut(
        id=post.id,
        title=post.title,
        content=post.content,
        link_url=post.link_url,
        media_url=post.media_url,
        media_type=post.media_type,
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
    post = Post(
        title=body.title,
        content=body.content or None,
        link_url=body.link_url or None,
        media_url=body.media_url or None,
        media_type=body.media_type or None,
        author_id=current_user.id,
    )
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

    media_url = post.media_url  # grab before deleting from DB
    db.delete(post)
    db.commit()

    # Delete the file from Supabase Storage (best-effort, don't fail if it errors)
    if media_url and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        try:
            base = settings.SUPABASE_URL.rstrip("/")
            # URL pattern: {base}/storage/v1/object/public/media/{path}
            prefix = f"{base}/storage/v1/object/public/media/"
            if media_url.startswith(prefix):
                storage_path = media_url[len(prefix):]  # e.g. "posts/uuid.png"
                delete_url = f"{base}/storage/v1/object/media/{storage_path}"
                httpx.delete(
                    delete_url,
                    headers={
                        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                        "apikey": settings.SUPABASE_SERVICE_KEY,
                    },
                    timeout=10,
                )
        except Exception:
            pass  # storage cleanup failure should never block the delete response
