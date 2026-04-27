import base64
import json
import logging

from app.config import settings
from app.database import SessionLocal
from app.models import PushSubscription

logger = logging.getLogger(__name__)


def send_push(user_id: int, title: str, body: str, url: str = "/") -> None:
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured, skipping push")
        return
    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.error("pywebpush is not installed")
        return

    from py_vapid import Vapid
    private_pem_bytes = base64.b64decode(settings.VAPID_PRIVATE_KEY)
    vapid = Vapid.from_pem(private_pem_bytes)

    db = SessionLocal()
    try:
        subs = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
        if not subs:
            logger.info(f"No push subscriptions for user {user_id}")
            return
        stale_ids = []
        for sub in subs:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                    },
                    data=json.dumps({"title": title, "body": body, "url": url}),
                    vapid_private_key=vapid,
                    vapid_claims={"sub": settings.VAPID_CLAIM_EMAIL},
                )
                logger.info(f"Push sent to user {user_id}")
            except WebPushException as exc:
                resp_text = exc.response.text if exc.response else "no response"
                resp_status = exc.response.status_code if exc.response else 0
                logger.error(f"WebPushException user={user_id} status={resp_status} body={resp_text}")
                if resp_status in (404, 410):
                    stale_ids.append(sub.id)
            except Exception as exc:
                logger.error(f"Push failed user={user_id}: {exc}", exc_info=True)
        if stale_ids:
            db.query(PushSubscription).filter(PushSubscription.id.in_(stale_ids)).delete()
            db.commit()
    finally:
        db.close()
