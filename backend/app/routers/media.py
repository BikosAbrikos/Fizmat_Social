import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.auth import get_current_user
from app.config import settings
from app.models import User

router = APIRouter(prefix="/api/media", tags=["media"])

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO = {"video/mp4", "video/quicktime", "video/webm", "video/avi"}
MAX_SIZE = 50 * 1024 * 1024  # 50 MB


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
        raise HTTPException(status_code=400, detail="Only images (jpg, png, gif, webp) and videos (mp4, mov, webm) are allowed")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50 MB)")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "bin"
    path = f"posts/{uuid.uuid4()}.{ext}"

    from supabase import create_client
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    try:
        client.storage.from_("media").upload(
            path=path,
            file=data,
            file_options={"content-type": content_type, "upsert": "true"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    url = client.storage.from_("media").get_public_url(path)
    return {"url": url, "media_type": media_type}
