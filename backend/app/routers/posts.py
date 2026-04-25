from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, subqueryload

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Comment, Like, Post, User
from app.schemas import CommentCreate, CommentOut, PostCreate, PostOut

router = APIRouter(prefix="/api/posts", tags=["posts"])


def _load_post(db: Session, post_id: int) -> Post | None:
    """Fetch a post with all relationships eagerly loaded to avoid N+1 queries."""
    return (
        db.query(Post)
        .options(
            joinedload(Post.author),
            subqueryload(Post.likes),
            subqueryload(Post.comments),
        )
        .filter(Post.id == post_id)
        .first()
    )


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
        comment_count=len(post.comments),
    )


# ── Feed ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[PostOut])
def get_feed(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    posts = (
        db.query(Post)
        .options(
            joinedload(Post.author),
            subqueryload(Post.likes),
            subqueryload(Post.comments),
        )
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_serialize_post(p, current_user.id) for p in posts]


# ── Single post ───────────────────────────────────────────────────────────────

@router.get("/{post_id}", response_model=PostOut)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = _load_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return _serialize_post(post, current_user.id)


# ── Create post ───────────────────────────────────────────────────────────────

@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    body: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    # Re-fetch with eager loading so relationships are available for serialization
    post = _load_post(db, post.id)
    return _serialize_post(post, current_user.id)


# ── Like toggle ───────────────────────────────────────────────────────────────

@router.post("/{post_id}/like", response_model=PostOut)
def toggle_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
    else:
        db.add(Like(post_id=post_id, user_id=current_user.id))
    db.commit()
    # Re-fetch with eager loading so updated likes/comments counts are accurate
    post = _load_post(db, post_id)
    return _serialize_post(post, current_user.id)


# ── Delete post ───────────────────────────────────────────────────────────────

@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id, Post.author_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found or not yours")

    media_url = post.media_url  # save before delete
    db.delete(post)
    db.commit()

    # Best-effort: remove file from Supabase Storage
    if media_url and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        try:
            base = settings.SUPABASE_URL.rstrip("/")
            prefix = f"{base}/storage/v1/object/public/media/"
            if media_url.startswith(prefix):
                storage_path = media_url[len(prefix):]
                httpx.delete(
                    f"{base}/storage/v1/object/media/{storage_path}",
                    headers={
                        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                        "apikey": settings.SUPABASE_SERVICE_KEY,
                    },
                    timeout=10,
                )
        except Exception:
            pass


# ── Comments ──────────────────────────────────────────────────────────────────

@router.get("/{post_id}/comments", response_model=List[CommentOut])
def get_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # noqa: ensures auth
):
    if not db.query(Post).filter(Post.id == post_id).first():
        raise HTTPException(status_code=404, detail="Post not found")
    return (
        db.query(Comment)
        .options(joinedload(Comment.author))
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .all()
    )


@router.post("/{post_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(
    post_id: int,
    body: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Post).filter(Post.id == post_id).first():
        raise HTTPException(status_code=404, detail="Post not found")
    comment = Comment(post_id=post_id, author_id=current_user.id, content=body.content)
    db.add(comment)
    db.commit()
    # Re-fetch with author so CommentOut serializes correctly
    comment = (
        db.query(Comment)
        .options(joinedload(Comment.author))
        .filter(Comment.id == comment.id)
        .first()
    )
    return comment


@router.delete("/{post_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    post_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = (
        db.query(Comment)
        .filter(
            Comment.id == comment_id,
            Comment.post_id == post_id,
            Comment.author_id == current_user.id,
        )
        .first()
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found or not yours")
    db.delete(comment)
    db.commit()
