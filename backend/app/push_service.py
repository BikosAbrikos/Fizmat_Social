import base64
import json

from app.config import settings
from app.database import SessionLocal
from app.models import PushSubscription


def send_push(user_id: int, title: str, body: str, url: str = "/") -> None:
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        return
    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        return

    private_pem = base64.b64decode(settings.VAPID_PRIVATE_KEY).decode()

    db = SessionLocal()
    try:
        subs = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
        stale_ids = []
        for sub in subs:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                    },
                    data=json.dumps({"title": title, "body": body, "url": url}),
                    vapid_private_key=private_pem,
                    vapid_claims={"sub": settings.VAPID_CLAIM_EMAIL},
                )
            except WebPushException as exc:
                if exc.response and exc.response.status_code in (404, 410):
                    stale_ids.append(sub.id)
            except Exception:
                pass
        if stale_ids:
            db.query(PushSubscription).filter(PushSubscription.id.in_(stale_ids)).delete()
            db.commit()
    finally:
        db.close()
