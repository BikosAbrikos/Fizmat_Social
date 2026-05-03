import os
from contextlib import asynccontextmanager

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.config import settings
from app.database import Base, engine
from app.routers import auth, blocks, chats, communities, friends, media, posts, push, users
from app.security import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Add username column to existing deployments that predate it
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)"
        ))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS grade VARCHAR(10)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(150)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS future_major VARCHAR(100)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS direct_messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_dm_sender_receiver ON direct_messages (sender_id, receiver_id)"
        ))
        conn.execute(text(
            "ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS title VARCHAR(300)"))
        conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_url VARCHAR(500)"))
        conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url VARCHAR(1000)"))
        conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type VARCHAR(10)"))
        conn.execute(text("ALTER TABLE posts ALTER COLUMN content DROP NOT NULL"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY,
                post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_comments_post_id ON comments (post_id)"
        ))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS friend_requests (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                endpoint TEXT NOT NULL UNIQUE,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS communities (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                description VARCHAR(300),
                avatar_url VARCHAR(500),
                is_private BOOLEAN NOT NULL DEFAULT FALSE,
                owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_communities_name ON communities (name)"
        ))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS community_members (
                id SERIAL PRIMARY KEY,
                community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(community_id, user_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS community_join_requests (
                id SERIAL PRIMARY KEY,
                community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "ALTER TABLE posts ADD COLUMN IF NOT EXISTS community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_likes_user_post ON likes (user_id, post_id)"
        ))
        conn.execute(text(
            "ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_comments_parent_id ON comments (parent_comment_id)"
        ))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS blocks (
                id SERIAL PRIMARY KEY,
                blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(blocker_id, blocked_id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_blocks_blocker ON blocks (blocker_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_blocks_blocked ON blocks (blocked_id)"))
        conn.execute(text(
            "ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0"
        ))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS seen_posts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                seen_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, post_id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_seen_posts_user ON seen_posts (user_id)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS saved_posts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                saved_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, post_id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_saved_posts_user ON saved_posts (user_id)"))
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS smart_feed BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        conn.commit()
    yield


app = FastAPI(
    title="FizMat Social",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down."},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    from fastapi import HTTPException as _HTTPException
    if isinstance(exc, _HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# ── Security headers ──────────────────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https:; "
        "font-src 'self' data:; "
        "frame-ancestors 'none';"
    )
    return response

# ── CORS ──────────────────────────────────────────────────────────────────────
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(friends.router)
app.include_router(blocks.router)
app.include_router(media.router)
app.include_router(chats.router)
app.include_router(push.router)
app.include_router(communities.router)


@app.get("/health")
def health():
    return {"status": "ok"}


# ── Serve React SPA ───────────────────────────────────────────────────────────
_FRONTEND = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend_build")

if os.path.isdir(_FRONTEND):
    app.mount("/static", StaticFiles(directory=os.path.join(_FRONTEND, "static")), name="react-static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        requested = os.path.join(_FRONTEND, full_path)
        if os.path.isfile(requested):
            return FileResponse(requested)
        return FileResponse(os.path.join(_FRONTEND, "index.html"))
else:
    @app.get("/")
    def root():
        return {"status": "ok"}
