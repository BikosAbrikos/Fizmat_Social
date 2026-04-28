from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload, subqueryload

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Block, Comment, Community, CommunityMember, Like, Post, SavedPost, SeenPost, User
from app.schemas import CommentCreate, CommentOut, CommunityBrief, PostCreate, PostOut
from app.security import limiter

router = APIRouter(prefix="/api/posts", tags=["posts"])


def _load_post(db: Session, post_id: int) -> Post | None:
    return (
        db.query(Post)
        .options(
            joinedload(Post.author),
            subqueryload(Post.likes),
            subqueryload(Post.comments),
            joinedload(Post.community),
        )
        .filter(Post.id == post_id)
        .first()
    )


def _serialize_post(post: Post, current_user_id: int, saved_ids: set[int] | None = None) -> PostOut:
    liked_by_me = any(like.user_id == current_user_id for like in post.likes)
    saved_by_me = post.id in saved_ids if saved_ids is not None else False
    community_brief = None
    if getattr(post, "community", None):
        community_brief = CommunityBrief(
            id=post.community.id,
            name=post.community.name,
            avatar_url=post.community.avatar_url,
        )
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
        saved_by_me=saved_by_me,
        community=community_brief,
    )


def _fetch_saved_ids(db: Session, user_id: int, post_ids: list[int]) -> set[int]:
    if not post_ids:
        return set()
    return {
        s.post_id
        for s in db.query(SavedPost.post_id)
            .filter(SavedPost.user_id == user_id, SavedPost.post_id.in_(post_ids))
            .all()
    }


# ── Feed ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[PostOut])
def get_feed(
    sort: str = "hot",   # "hot" or "new"
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    blocked_ids = [b.blocked_id for b in db.query(Block).filter(Block.blocker_id == current_user.id).all()]
    blocking_ids = [b.blocker_id for b in db.query(Block).filter(Block.blocked_id == current_user.id).all()]
    excluded = set(blocked_ids + blocking_ids)

    seen_subq = db.query(SeenPost.post_id).filter(SeenPost.user_id == current_user.id).subquery()

    query = (
        db.query(Post)
        .options(
            joinedload(Post.author),
            subqueryload(Post.likes),
            subqueryload(Post.comments),
            joinedload(Post.community),
        )
        .filter(Post.id.notin_(seen_subq))
    )
    if excluded:
        query = query.filter(Post.author_id.notin_(excluded))

    if sort == "new":
        posts = query.order_by(Post.created_at.desc()).limit(limit).all()
    else:
        # Fetch candidate pool, score and rank in Python
        candidates = query.order_by(Post.created_at.desc()).limit(200).all()
        candidates.sort(key=lambda p: len(p.likes) + len(p.comments) * 2, reverse=True)
        posts = candidates[:limit]

    # Mark returned posts as seen (idempotent)
    if posts:
        db.execute(
            text("INSERT INTO seen_posts (user_id, post_id) VALUES (:user_id, :post_id) ON CONFLICT DO NOTHING"),
            [{"user_id": current_user.id, "post_id": p.id} for p in posts],
        )
        db.commit()

    saved_ids = _fetch_saved_ids(db, current_user.id, [p.id for p in posts])
    return [_serialize_post(p, current_user.id, saved_ids) for p in posts]


# ── Saved posts ───────────────────────────────────────────────────────────────

@router.get("/saved", response_model=List[PostOut])
def get_saved_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved_records = (
        db.query(SavedPost)
        .filter(SavedPost.user_id == current_user.id)
        .order_by(SavedPost.saved_at.desc())
        .all()
    )
    post_ids = [s.post_id for s in saved_records]
    if not post_ids:
        return []

    posts = (
        db.query(Post)
        .options(
            joinedload(Post.author),
            subqueryload(Post.likes),
            subqueryload(Post.comments),
            joinedload(Post.community),
        )
        .filter(Post.id.in_(post_ids))
        .all()
    )
    post_map = {p.id: p for p in posts}
    ordered = [post_map[pid] for pid in post_ids if pid in post_map]
    saved_ids = set(post_ids)
    return [_serialize_post(p, current_user.id, saved_ids) for p in ordered]


# ── Reset seen history ────────────────────────────────────────────────────────

@router.delete("/seen", status_code=status.HTTP_204_NO_CONTENT)
def reset_seen(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(SeenPost).filter(SeenPost.user_id == current_user.id).delete()
    db.commit()


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
    saved_ids = _fetch_saved_ids(db, current_user.id, [post_id])
    return _serialize_post(post, current_user.id, saved_ids)


# ── Create post ───────────────────────────────────────────────────────────────

@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/hour")
def create_post(
    request: Request,
    body: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resolved_community_id = None
    if body.community_id is not None:
        community = db.query(Community).filter(Community.id == body.community_id).first()
        if not community:
            raise HTTPException(status_code=404, detail="Community not found")
        is_member = db.query(CommunityMember).filter(
            CommunityMember.community_id == body.community_id,
            CommunityMember.user_id == current_user.id,
        ).first()
        if not is_member:
            raise HTTPException(status_code=403, detail="You must be a member of the community to post in it")
        resolved_community_id = body.community_id

    post = Post(
        title=body.title,
        content=body.content or None,
        link_url=body.link_url or None,
        media_url=body.media_url or None,
        media_type=body.media_type or None,
        author_id=current_user.id,
        community_id=resolved_community_id,
    )
    db.add(post)
    db.commit()
    post = _load_post(db, post.id)
    return _serialize_post(post, current_user.id)


# ── Save toggle ───────────────────────────────────────────────────────────────

@router.post("/{post_id}/save", response_model=PostOut)
def toggle_save(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = _load_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(SavedPost).filter(SavedPost.post_id == post_id, SavedPost.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        is_saved = False
    else:
        db.add(SavedPost(post_id=post_id, user_id=current_user.id))
        is_saved = True
    db.commit()

    saved_ids = {post_id} if is_saved else set()
    return _serialize_post(post, current_user.id, saved_ids)


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
    post = _load_post(db, post_id)
    saved_ids = _fetch_saved_ids(db, current_user.id, [post_id])
    return _serialize_post(post, current_user.id, saved_ids)


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

    media_url = post.media_url
    db.delete(post)
    db.commit()

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
    current_user: User = Depends(get_current_user),
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
@limiter.limit("30/hour")
def create_comment(
    request: Request,
    post_id: int,
    body: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Post).filter(Post.id == post_id).first():
        raise HTTPException(status_code=404, detail="Post not found")
    if body.parent_comment_id is not None:
        parent = db.query(Comment).filter(
            Comment.id == body.parent_comment_id,
            Comment.post_id == post_id,
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    comment = Comment(
        post_id=post_id,
        author_id=current_user.id,
        content=body.content,
        parent_comment_id=body.parent_comment_id,
    )
    db.add(comment)
    db.commit()
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
