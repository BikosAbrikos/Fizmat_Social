import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function PostCard({ post, onUpdate, onDelete }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/api/posts/${post.id}/like`);
      onUpdate(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await api.delete(`/api/posts/${post.id}`);
      onDelete(post.id);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete post");
    }
  };

  const goToDetail = () => navigate(`/posts/${post.id}`);
  const initials = post.author.name.charAt(0).toUpperCase();
  const commentCount = post.comment_count ?? 0;

  return (
    <div style={{
      display: "flex",
      background: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: 4,
      marginBottom: 10,
      overflow: "hidden",
      transition: "border-color 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = theme.textSub}
      onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
    >
      {/* Vote column */}
      <div style={{
        width: 40,
        background: theme.cardHover,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 0",
        gap: 2,
        flexShrink: 0,
      }}>
        <button
          onClick={handleLike}
          disabled={loading}
          style={{
            background: "none",
            border: "none",
            cursor: loading ? "wait" : "pointer",
            color: post.liked_by_me ? theme.upvote : theme.textSub,
            fontSize: 18,
            lineHeight: 1,
            padding: "2px 0",
            fontWeight: 700,
          }}
          title="Upvote"
        >
          ▲
        </button>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: post.liked_by_me ? theme.upvote : theme.text,
          minWidth: 20,
          textAlign: "center",
        }}>
          {post.like_count}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "8px 10px", minWidth: 0 }}>
        {/* Meta: community + author + time */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
          {post.community && (
            <>
              <span
                style={{ fontSize: 12, fontWeight: 700, color: theme.text, cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); navigate(`/communities/${post.community.id}`); }}
              >
                c/{post.community.name}
              </span>
              <span style={{ color: theme.border, fontSize: 12 }}>·</span>
            </>
          )}
          <span
            style={{ fontSize: 12, color: theme.textSub, cursor: "pointer" }}
            onClick={() => navigate(`/users/${post.author.id}`)}
          >
            {post.author.avatar_url
              ? <img src={post.author.avatar_url} alt="" style={{ width: 16, height: 16, borderRadius: "50%", verticalAlign: "middle", marginRight: 4, objectFit: "cover" }} />
              : <span style={{ display: "inline-flex", width: 16, height: 16, borderRadius: "50%", background: theme.accent, color: "#fff", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, verticalAlign: "middle", marginRight: 4 }}>{initials}</span>
            }
            u/{post.author.username || post.author.name}
          </span>
          <span style={{ color: theme.textSub, fontSize: 12 }}>· {timeAgo(post.created_at)}</span>
        </div>

        {/* Title */}
        {post.title && (
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: theme.text,
              lineHeight: 1.3,
              marginBottom: 6,
              cursor: "pointer",
            }}
            onClick={goToDetail}
          >
            {post.title}
          </div>
        )}

        {/* Body preview (first 200 chars) */}
        {post.content && post.content.trim() && (
          <p style={{ fontSize: 14, color: theme.textSub, lineHeight: 1.5, marginBottom: 8, margin: "0 0 8px" }}>
            {post.content.length > 200 ? post.content.slice(0, 200) + "…" : post.content}
          </p>
        )}

        {/* Link */}
        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              fontSize: 13,
              color: theme.link,
              wordBreak: "break-all",
              marginBottom: 8,
              textDecoration: "none",
            }}
          >
            🔗 {post.link_url.length > 60 ? post.link_url.slice(0, 60) + "…" : post.link_url}
          </a>
        )}

        {/* Media */}
        {post.media_url && post.media_type === "image" && (
          <img
            src={post.media_url}
            alt=""
            onClick={goToDetail}
            style={{ width: "100%", maxHeight: 512, objectFit: "contain", borderRadius: 4, marginBottom: 8, display: "block", cursor: "pointer", background: theme.cardHover }}
          />
        )}
        {post.media_url && post.media_type === "video" && (
          <video
            src={post.media_url}
            controls
            style={{ width: "100%", maxHeight: 400, borderRadius: 4, marginBottom: 8, display: "block", background: theme.cardHover }}
          />
        )}

        {/* Action bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
          <button
            onClick={goToDetail}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: theme.textSub,
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: 2,
              fontFamily: "inherit",
            }}
            onMouseEnter={e => e.currentTarget.style.background = theme.cardHover}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            💬 {commentCount} {commentCount === 1 ? "Comment" : "Comments"}
          </button>

          {user?.id === post.author.id && (
            <button
              onClick={handleDelete}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: theme.danger,
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: 2,
                fontFamily: "inherit",
                marginLeft: "auto",
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
