import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import PostCard from "../components/PostCard";
import { useTheme } from "../context/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [communities, setCommunities] = useState([]);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  useEffect(() => {
    api.get("/api/posts")
      .then(({ data }) => setPosts(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    api.get("/api/communities/me/joined")
      .then(({ data }) => setCommunities(data))
      .catch(() => {});
  }, []);

  const handleUpdate = (updated) => setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
  const handleDelete = (id) => setPosts(prev => prev.filter(p => p.id !== id));

  const mainFeed = (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Create post bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 4,
        padding: "8px 10px",
        marginBottom: 16,
      }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: theme.cardHover,
          border: `1px solid ${theme.border}`,
          flexShrink: 0,
        }} />
        <button
          style={{
            flex: 1,
            textAlign: "left",
            background: theme.input,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: 4,
            padding: "8px 12px",
            fontSize: 14,
            color: theme.textSub,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          onClick={() => navigate("/submit")}
          onFocus={e => e.currentTarget.style.borderColor = theme.accent}
          onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
        >
          Create Post
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: theme.textSub, padding: "40px 0", fontSize: 14 }}>
          Loading...
        </div>
      )}
      {error && (
        <div style={{ textAlign: "center", color: theme.danger, padding: "40px 0", fontSize: 14 }}>
          Failed to load posts. Please refresh.
        </div>
      )}
      {!loading && !error && posts.length === 0 && (
        <div style={{ textAlign: "center", color: theme.textSub, padding: "40px 0", fontSize: 14 }}>
          No posts yet — be the first!
        </div>
      )}
      {posts.map(post => (
        <PostCard key={post.id} post={post} onUpdate={handleUpdate} onDelete={handleDelete} />
      ))}
    </div>
  );

  const sidebar = !isMobile && (
    <div style={{ width: 312, flexShrink: 0 }}>
      {/* Create post card */}
      <div style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 16,
      }}>
        <div style={{
          background: theme.accent,
          padding: "12px 14px",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
        }}>
          FizMat Social
        </div>
        <div style={{ padding: 12 }}>
          <p style={{ fontSize: 13, color: theme.textSub, marginBottom: 12, lineHeight: 1.5 }}>
            The school community for FizMat students. Share ideas, ask questions, and connect.
          </p>
          <button
            onClick={() => navigate("/submit")}
            style={{
              width: "100%",
              padding: "8px 0",
              background: theme.accent,
              color: "#fff",
              border: "none",
              borderRadius: 20,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
              marginBottom: 8,
            }}
          >
            Create Post
          </button>
          <button
            onClick={() => navigate("/communities/create")}
            style={{
              width: "100%",
              padding: "8px 0",
              background: "none",
              color: theme.accent,
              border: `1px solid ${theme.accent}`,
              borderRadius: 20,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Create Community
          </button>
        </div>
      </div>

      {/* My communities */}
      {communities.length > 0 && (
        <div style={{
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: 4,
          overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5 }}>
              My Communities
            </span>
          </div>
          {communities.slice(0, 5).map(c => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                cursor: "pointer",
                borderBottom: `1px solid ${theme.border}`,
              }}
              onClick={() => navigate(`/communities/${c.id}`)}
              onMouseEnter={e => e.currentTarget.style.background = theme.cardHover}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              {c.avatar_url
                ? <img src={c.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 24, height: 24, borderRadius: "50%", background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
              }
              <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>c/{c.name}</span>
            </div>
          ))}
          <div
            style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: theme.link, fontWeight: 600 }}
            onClick={() => navigate("/communities")}
          >
            View all communities
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      maxWidth: isMobile ? "100%" : 980,
      margin: "0 auto",
      padding: isMobile ? "12px 10px 80px" : "20px 20px",
      display: "flex",
      gap: 24,
      alignItems: "flex-start",
    }}>
      {mainFeed}
      {sidebar}
    </div>
  );
}
