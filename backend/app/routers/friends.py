from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import FriendRequest, User
from app.schemas import FriendRequestOut, FriendStatusOut, UserOut

router = APIRouter(prefix="/api/friends", tags=["friends"])


def _get_request(db: Session, request_id: int, current_user: User) -> FriendRequest:
    req = db.query(FriendRequest).filter(FriendRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return req


@router.post("/request/{user_id}", status_code=201)
def send_request(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(FriendRequest).filter(
        ((FriendRequest.sender_id == current_user.id) & (FriendRequest.receiver_id == user_id)) |
        ((FriendRequest.sender_id == user_id) & (FriendRequest.receiver_id == current_user.id))
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Request already exists")

    req = FriendRequest(sender_id=current_user.id, receiver_id=user_id)
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"message": "Friend request sent"}


@router.get("/status/{user_id}", response_model=FriendStatusOut)
def get_status(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = db.query(FriendRequest).filter(
        ((FriendRequest.sender_id == current_user.id) & (FriendRequest.receiver_id == user_id)) |
        ((FriendRequest.sender_id == user_id) & (FriendRequest.receiver_id == current_user.id))
    ).first()

    if not req:
        return FriendStatusOut(status="none")
    if req.status == "accepted":
        return FriendStatusOut(status="friends", request_id=req.id)
    if req.sender_id == current_user.id:
        return FriendStatusOut(status="pending_sent", request_id=req.id)
    return FriendStatusOut(status="pending_received", request_id=req.id)


@router.get("/requests/incoming", response_model=list[FriendRequestOut])
def get_incoming(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(FriendRequest).filter(
        FriendRequest.receiver_id == current_user.id,
        FriendRequest.status == "pending",
    ).all()


@router.get("/requests/incoming/count")
def get_incoming_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(FriendRequest).filter(
        FriendRequest.receiver_id == current_user.id,
        FriendRequest.status == "pending",
    ).count()
    return {"count": count}


@router.post("/requests/{request_id}/accept", response_model=FriendRequestOut)
def accept_request(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = _get_request(db, request_id, current_user)
    if req.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your request")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")
    req.status = "accepted"
    db.commit()
    db.refresh(req)
    return req


@router.post("/requests/{request_id}/reject", response_model=FriendRequestOut)
def reject_request(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = _get_request(db, request_id, current_user)
    if req.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your request")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")
    req.status = "rejected"
    db.commit()
    db.refresh(req)
    return req


@router.get("", response_model=list[UserOut])
def get_friends(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    accepted = db.query(FriendRequest).filter(
        ((FriendRequest.sender_id == current_user.id) | (FriendRequest.receiver_id == current_user.id)),
        FriendRequest.status == "accepted",
    ).all()

    friend_ids = [
        r.receiver_id if r.sender_id == current_user.id else r.sender_id
        for r in accepted
    ]
    if not friend_ids:
        return []
    return db.query(User).filter(User.id.in_(friend_ids)).all()
