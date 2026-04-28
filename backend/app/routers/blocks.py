from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Block, FriendRequest, User
from app.schemas import UserOut

router = APIRouter(prefix="/api/blocks", tags=["blocks"])


@router.get("", response_model=List[UserOut])
def list_blocked(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    blocks = db.query(Block).filter(Block.blocker_id == current_user.id).all()
    user_ids = [b.blocked_id for b in blocks]
    if not user_ids:
        return []
    return db.query(User).filter(User.id.in_(user_ids)).all()


@router.get("/status/{user_id}")
def get_block_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    block = db.query(Block).filter(
        Block.blocker_id == current_user.id,
        Block.blocked_id == user_id,
    ).first()
    return {"is_blocked": block is not None}


@router.post("/{user_id}", status_code=status.HTTP_201_CREATED)
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(Block).filter(
        Block.blocker_id == current_user.id,
        Block.blocked_id == user_id,
    ).first()
    if existing:
        return {"message": "Already blocked"}

    # Remove any existing friend request between these users
    fr = db.query(FriendRequest).filter(
        ((FriendRequest.sender_id == current_user.id) & (FriendRequest.receiver_id == user_id)) |
        ((FriendRequest.sender_id == user_id) & (FriendRequest.receiver_id == current_user.id))
    ).first()
    if fr:
        db.delete(fr)

    db.add(Block(blocker_id=current_user.id, blocked_id=user_id))
    db.commit()
    return {"message": "User blocked"}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    block = db.query(Block).filter(
        Block.blocker_id == current_user.id,
        Block.blocked_id == user_id,
    ).first()
    if not block:
        raise HTTPException(status_code=404, detail="Not blocked")
    db.delete(block)
    db.commit()
