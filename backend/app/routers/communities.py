from typing import List, Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import (
    Community,
    CommunityJoinRequest,
    CommunityMember,
    Post,
    User,
)
from app.routers.posts import _serialize_post
from app.schemas import (
    CommunityCreate,
    CommunityMemberOut,
    CommunityOut,
    CommunityUpdate,
    JoinRequestOut,
    PostOut,
)

router = APIRouter(prefix="/api/communities", tags=["communities"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_my_role(db: Session, community_id: int, user_id: int) -> Optional[str]:
    """Return the current user's role string, 'pending', or None."""
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id,
    ).first()
    if member:
        return member.role

    pending = db.query(CommunityJoinRequest).filter(
        CommunityJoinRequest.community_id == community_id,
        CommunityJoinRequest.user_id == user_id,
        CommunityJoinRequest.status == "pending",
    ).first()
    if pending:
        return "pending"

    return None


def _member_count(db: Session, community_id: int) -> int:
    return db.query(func.count(CommunityMember.id)).filter(
        CommunityMember.community_id == community_id
    ).scalar() or 0


def _serialize_community(db: Session, community: Community, user_id: int) -> CommunityOut:
    return CommunityOut(
        id=community.id,
        name=community.name,
        description=community.description,
        avatar_url=community.avatar_url,
        is_private=community.is_private,
        owner_id=community.owner_id,
        created_at=community.created_at,
        member_count=_member_count(db, community.id),
        my_role=_get_my_role(db, community.id, user_id),
    )


def _send_push_to_user(user_id: int, title: str, body: str, db: Session) -> None:
    """Best-effort push notification — delegates to push_service."""
    from app.push_service import send_push
    send_push(user_id, title, body, "/communities")


# ── List / Search ─────────────────────────────────────────────────────────────

@router.get("", response_model=List[CommunityOut])
def list_communities(
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Community)
    if q and q.strip():
        query = query.filter(Community.name.ilike(f"%{q.strip()}%"))
    communities = query.order_by(Community.created_at.desc()).limit(100).all()
    return [_serialize_community(db, c, current_user.id) for c in communities]


# ── My joined communities — MUST be before /{id} ─────────────────────────────

@router.get("/me/joined", response_model=List[CommunityOut])
def my_joined_communities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memberships = (
        db.query(CommunityMember)
        .filter(CommunityMember.user_id == current_user.id)
        .all()
    )
    community_ids = [m.community_id for m in memberships]
    if not community_ids:
        return []
    communities = db.query(Community).filter(Community.id.in_(community_ids)).all()
    return [_serialize_community(db, c, current_user.id) for c in communities]


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=CommunityOut, status_code=status.HTTP_201_CREATED)
def create_community(
    body: CommunityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Community).filter(Community.name == body.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="A community with this name already exists")

    community = Community(
        name=body.name,
        description=body.description or None,
        is_private=body.is_private,
        owner_id=current_user.id,
    )
    db.add(community)
    db.flush()  # get community.id before commit

    # Auto-add creator as owner member
    db.add(CommunityMember(
        community_id=community.id,
        user_id=current_user.id,
        role="owner",
    ))
    db.commit()
    db.refresh(community)
    return _serialize_community(db, community, current_user.id)


# ── Get one ───────────────────────────────────────────────────────────────────

@router.get("/{community_id}", response_model=CommunityOut)
def get_community(
    community_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    return _serialize_community(db, community, current_user.id)


# ── Update ────────────────────────────────────────────────────────────────────

@router.put("/{community_id}", response_model=CommunityOut)
def update_community(
    community_id: int,
    body: CommunityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    if community.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can edit this community")

    if body.name is not None:
        # Check uniqueness if name changed
        if body.name != community.name:
            existing = db.query(Community).filter(Community.name == body.name).first()
            if existing:
                raise HTTPException(status_code=409, detail="A community with this name already exists")
        community.name = body.name
    if body.description is not None:
        community.description = body.description
    if body.avatar_url is not None:
        community.avatar_url = body.avatar_url
    if body.is_private is not None:
        community.is_private = body.is_private

    db.commit()
    db.refresh(community)
    return _serialize_community(db, community, current_user.id)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{community_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_community(
    community_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    if community.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this community")

    # Delete all community posts and their media from Supabase Storage
    posts = db.query(Post).filter(Post.community_id == community_id).all()
    for post in posts:
        if post.media_url and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
            try:
                base = settings.SUPABASE_URL.rstrip("/")
                prefix = f"{base}/storage/v1/object/public/media/"
                if post.media_url.startswith(prefix):
                    storage_path = post.media_url[len(prefix):]
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
        db.delete(post)

    db.delete(community)
    db.commit()


# ── Join ──────────────────────────────────────────────────────────────────────

@router.post("/{community_id}/join", response_model=CommunityOut)
def join_community(
    community_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    # Already a member?
    existing_member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id,
    ).first()
    if existing_member:
        raise HTTPException(status_code=409, detail="You are already a member of this community")

    # Already pending?
    existing_request = db.query(CommunityJoinRequest).filter(
        CommunityJoinRequest.community_id == community_id,
        CommunityJoinRequest.user_id == current_user.id,
        CommunityJoinRequest.status == "pending",
    ).first()
    if existing_request:
        raise HTTPException(status_code=409, detail="You already have a pending join request")

    if community.is_private:
        # Create a join request and notify owner
        join_request = CommunityJoinRequest(
            community_id=community_id,
            user_id=current_user.id,
            status="pending",
        )
        db.add(join_request)
        db.commit()

        # Notify owner via push
        owner_id = community.owner_id
        requester_name = current_user.name
        community_name = community.name
        background_tasks.add_task(
            _send_push_to_user,
            owner_id,
            f"Join request for {community_name}",
            f"{requester_name} wants to join your community",
            db,
        )
    else:
        # Public community — instant join
        db.add(CommunityMember(
            community_id=community_id,
            user_id=current_user.id,
            role="member",
        ))
        db.commit()

    return _serialize_community(db, community, current_user.id)


# ── Leave ─────────────────────────────────────────────────────────────────────

@router.delete("/{community_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_community(
    community_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    if community.owner_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="The owner cannot leave. Delete the community instead.",
        )

    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="You are not a member of this community")

    db.delete(member)
    db.commit()


# ── Members ───────────────────────────────────────────────────────────────────

@router.get("/{community_id}/members", response_model=List[CommunityMemberOut])
def list_members(
    community_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    members = (
        db.query(CommunityMember)
        .options(joinedload(CommunityMember.user))
        .filter(CommunityMember.community_id == community_id)
        .order_by(CommunityMember.joined_at.asc())
        .all()
    )
    return members


# ── Kick member ───────────────────────────────────────────────────────────────

@router.delete("/{community_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def kick_member(
    community_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    # Check that kicker is owner or moderator
    kicker_member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id,
    ).first()
    if not kicker_member or kicker_member.role not in ("owner", "moderator"):
        raise HTTPException(status_code=403, detail="Only owners and moderators can kick members")

    # Can't kick the owner
    if user_id == community.owner_id:
        raise HTTPException(status_code=400, detail="The owner cannot be kicked")

    target_member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id,
    ).first()
    if not target_member:
        raise HTTPException(status_code=404, detail="This user is not a member")

    db.delete(target_member)
    db.commit()


# ── Join requests ─────────────────────────────────────────────────────────────

@router.get("/{community_id}/requests", response_model=List[JoinRequestOut])
def list_requests(
    community_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    # Only owner or moderator
    caller_member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id,
    ).first()
    if not caller_member or caller_member.role not in ("owner", "moderator"):
        raise HTTPException(status_code=403, detail="Only owners and moderators can view join requests")

    requests = (
        db.query(CommunityJoinRequest)
        .options(joinedload(CommunityJoinRequest.user))
        .filter(
            CommunityJoinRequest.community_id == community_id,
            CommunityJoinRequest.status == "pending",
        )
        .order_by(CommunityJoinRequest.created_at.asc())
        .all()
    )
    return requests


@router.post("/{community_id}/requests/{req_id}/accept", response_model=CommunityOut)
def accept_request(
    community_id: int,
    req_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    caller_member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id,
    ).first()
    if not caller_member or caller_member.role not in ("owner", "moderator"):
        raise HTTPException(status_code=403, detail="Only owners and moderators can accept requests")

    join_request = db.query(CommunityJoinRequest).filter(
        CommunityJoinRequest.id == req_id,
        CommunityJoinRequest.community_id == community_id,
        CommunityJoinRequest.status == "pending",
    ).first()
    if not join_request:
        raise HTTPException(status_code=404, detail="Join request not found")

    # Check if already a member (idempotent safety)
    already = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == join_request.user_id,
    ).first()
    if not already:
        db.add(CommunityMember(
            community_id=community_id,
            user_id=join_request.user_id,
            role="member",
        ))

    join_request.status = "accepted"
    db.commit()
    db.refresh(community)
    return _serialize_community(db, community, current_user.id)


@router.post("/{community_id}/requests/{req_id}/reject", response_model=CommunityOut)
def reject_request(
    community_id: int,
    req_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    caller_member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id,
    ).first()
    if not caller_member or caller_member.role not in ("owner", "moderator"):
        raise HTTPException(status_code=403, detail="Only owners and moderators can reject requests")

    join_request = db.query(CommunityJoinRequest).filter(
        CommunityJoinRequest.id == req_id,
        CommunityJoinRequest.community_id == community_id,
        CommunityJoinRequest.status == "pending",
    ).first()
    if not join_request:
        raise HTTPException(status_code=404, detail="Join request not found")

    join_request.status = "rejected"
    db.commit()
    db.refresh(community)
    return _serialize_community(db, community, current_user.id)


# ── Community posts ───────────────────────────────────────────────────────────

@router.get("/{community_id}/posts", response_model=List[PostOut])
def get_community_posts(
    community_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy.orm import subqueryload

    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    my_role = _get_my_role(db, community_id, current_user.id)
    is_member = my_role in ("owner", "moderator", "member")

    if community.is_private and not is_member:
        raise HTTPException(
            status_code=403,
            detail="This is a private community. Join to see its posts.",
        )

    from app.models import Post as PostModel
    posts = (
        db.query(PostModel)
        .options(
            joinedload(PostModel.author),
            subqueryload(PostModel.likes),
            subqueryload(PostModel.comments),
            joinedload(PostModel.community),
        )
        .filter(PostModel.community_id == community_id)
        .order_by(PostModel.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_serialize_post(p, current_user.id) for p in posts]
