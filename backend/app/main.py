from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, engine
from app.routers import auth, chats, communities, friends, media, posts, push, users


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
        conn.commit()
    yield


app = FastAPI(title="FizMat Social", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(friends.router)
app.include_router(media.router)
app.include_router(chats.router)
app.include_router(push.router)
app.include_router(communities.router)


@app.get("/")
def root():
    return {"status": "ok"}
