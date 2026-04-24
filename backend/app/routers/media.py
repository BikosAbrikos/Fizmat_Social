import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.auth import get_current_user
from app.config import settings
from app.models import User

router = APIRouter(prefix="/api/media", tags=["media"])

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO = {"video/mp4", "video/quicktime", "video/webm", "video/avi"}
MAX_SIZE = 50 * 1024 * 1024  # 50 MB
BUCKET = "media"


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="Media storage not configured")

    content_type = file.content_type or ""
    if content_type in ALLOWED_IMAGE:
        media_type = "image"
    elif content_type in ALLOWED_VIDEO:
        media_type = "video"
    else:
        raise HTTPException(
            status_code=400,
            detail="Only images (jpg, png, gif, webp) and videos (mp4, mov, webm) are allowed",
        )

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50 MB)")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "bin"
    path = f"posts/{uuid.uuid4()}.{ext}"

    # Call Supabase Storage REST API directly — avoids supabase-py SDK bugs
    base = settings.SUPABASE_URL.rstrip("/")
    upload_url = f"{base}/storage/v1/object/{BUCKET}/{path}"

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            upload_url,
            content=data,
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                "Content-Type": content_type,
            },
            timeout=60,
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail=f"Upload failed: {resp.text}")

    public_url = f"{base}/storage/v1/object/public/{BUCKET}/{path}"
    return {"url": public_url, "media_type": media_type}
