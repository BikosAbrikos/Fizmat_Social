# FizMat Social — Setup & Run Guide

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

---

## 1. Database Setup

Open psql or pgAdmin and run:

```sql
CREATE DATABASE social_media;
```

---

## 2. Backend Setup

```bash
cd backend

# Copy and edit env (update DB password if needed)
cp .env.example .env

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server (tables are created automatically on first run)
uvicorn app.main:app --reload --port 8000
```

The API will be available at http://localhost:8000  
Interactive docs: http://localhost:8000/docs

---

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm start
```

The app will open at http://localhost:3000

---

## 4. Using the App

1. Go to http://localhost:3000/register
2. Register with an **@fizmat.kz** email (e.g. `student@fizmat.kz`)
3. Log in at http://localhost:3000/login
4. Create posts, like/unlike posts in the feed
5. Edit your name and avatar URL in Profile

---

## Project Structure

```
social_media/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entry point
│   │   ├── config.py        # Settings from .env
│   │   ├── database.py      # SQLAlchemy engine + session
│   │   ├── models.py        # User, Post, Like ORM models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── auth.py          # JWT logic, password hashing
│   │   └── routers/
│   │       ├── auth.py      # POST /api/auth/register, /login
│   │       ├── users.py     # GET/PUT /api/users/me
│   │       └── posts.py     # CRUD /api/posts + /like
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── public/index.html
    └── src/
        ├── api/client.js        # Axios instance with JWT interceptor
        ├── context/AuthContext  # Global auth state
        ├── components/
        │   ├── Navbar.jsx
        │   ├── PostCard.jsx
        │   └── PrivateRoute.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Feed.jsx
        │   └── Profile.jsx
        ├── App.jsx
        └── index.jsx
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Register (fizmat.kz only) |
| POST | /api/auth/login | No | Login → JWT token |
| GET | /api/users/me | Yes | Get current user |
| PUT | /api/users/me | Yes | Update name / avatar |
| GET | /api/posts | Yes | Feed (latest first) |
| POST | /api/posts | Yes | Create post |
| POST | /api/posts/{id}/like | Yes | Toggle like |
| DELETE | /api/posts/{id} | Yes | Delete own post |
