from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _rate_limit_key(request: Request) -> str:
    """Rate-limit by user ID when authenticated, fall back to IP address."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            from jose import jwt
            from app.config import settings
            payload = jwt.decode(
                auth[7:], settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
            uid = payload.get("sub")
            if uid:
                return f"user:{uid}"
        except Exception:
            pass
    return get_remote_address(request)


limiter = Limiter(key_func=_rate_limit_key)
