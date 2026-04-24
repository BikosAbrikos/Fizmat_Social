from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import DirectMessage, FriendRequest, User
from app.schemas import MessageCreate, MessageOut, UnreadChatOut

router = APIRouter(prefix="/api/chats", tags=["chats"])


def _are_friends(db: Session, user1_id: int, user2_id: int) -> bool:
    return db.query(FriendRequest).filter(
        or_(
            and_(FriendRequest.sender_id == user1_id, FriendRequest.receiver_id == user2_id),
            and_(FriendRequest.sender_id == user2_id, FriendRequest.receiver_id == user1_id),
        ),
        FriendRequest.status == "accepted",
    ).first() is not None


@router.get("/unread", response_model=list[UnreadChatOut])
def get_unread(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return one entry per sender who has unread messages for current user."""
    unread_msgs = (
        db.query(DirectMessage)
        .filter(DirectMessage.receiver_id == current_user.id, DirectMessage.read.is_(False))
        .order_by(DirectMessage.created_at.desc())
        .all()
    )

    seen_senders = {}
    for msg in unread_msgs:
        if msg.sender_id not in seen_senders:
            seen_senders[msg.sender_id] = {"sender": msg.sender, "count": 0, "last_message": msg.content, "last_at": msg.created_at}
        seen_senders[msg.sender_id]["count"] += 1

    return [
        UnreadChatOut(
            sender=v["sender"],
            count=v["count"],
            last_message=v["last_message"],
            last_at=v["last_at"],
        )
        for v in seen_senders.values()
    ]


@router.get("/unread/count")
def get_unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(DirectMessage).filter(
        DirectMessage.receiver_id == current_user.id,
        DirectMessage.read.is_(False),
    ).count()
    return {"count": count}


@router.get("/{friend_id}/messages", response_model=list[MessageOut])
def get_messages(
    friend_id: int,
    since_id: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _are_friends(db, current_user.id, friend_id):
        raise HTTPException(status_code=403, detail="Not friends")

    # Mark all messages from friend to me as read
    db.query(DirectMessage).filter(
        DirectMessage.sender_id == friend_id,
        DirectMessage.receiver_id == current_user.id,
        DirectMessage.read.is_(False),
    ).update({"read": True})
    db.commit()

    q = db.query(DirectMessage).filter(
        or_(
            and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == friend_id),
            and_(DirectMessage.sender_id == friend_id, DirectMessage.receiver_id == current_user.id),
        )
    )

    if since_id:
        return q.filter(DirectMessage.id > since_id).order_by(DirectMessage.created_at.asc()).all()
    else:
        msgs = q.order_by(DirectMessage.created_at.desc()).limit(50).all()
        return list(reversed(msgs))


@router.post("/{friend_id}/messages", response_model=MessageOut, status_code=201)
def send_message(
    friend_id: int,
    body: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if friend_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    if not _are_friends(db, current_user.id, friend_id):
        raise HTTPException(status_code=403, detail="You can only chat with friends")
    if not db.query(User).filter(User.id == friend_id).first():
        raise HTTPException(status_code=404, detail="User not found")

    msg = DirectMessage(sender_id=current_user.id, receiver_id=friend_id, content=body.content.strip())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
