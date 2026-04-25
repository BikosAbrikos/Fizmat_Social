import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const s = {
  card: { background: "#fff", borderRadius: 8, padding: 20, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: "50%", objectFit: "cover", background: "#e4e6eb" },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: "50%", background: "#1877f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 },
  authorLink: { display: "flex", alignItems: "center", gap: 12, cursor: "pointer" },
  name: { fontWeight: 600, fontSize: 15, color: "#1c1e21" },
  username: { fontSize: 12, color: "#65676b" },
  date: { fontSize: 12, color: "#65676b" },
  title: {
    fontSize: 18, fontWeight: 700, lineHeight: 1.35, marginBottom: 8,
    color: "#1c1e21", cursor: "pointer", display: "inline-block",
  },
  titleHover: { textDecoration: "underline" },
  content: { fontSize: 15, lineHeight: 1.5, marginBottom: 12, color: "#1c1e21" },
  linkBox: {
    display: "block", marginBottom: 12, padding: "10px 14px",
    background: "#f0f2f5", borderRadius: 6, border: "1px solid #e4e6eb",
    color: "#1877f2", fontSize: 14, textDecoration: "none",
    wordBreak: "break-all", lineHeight: 1.4,
  },
  media: { width: "100%", maxHeight: 2000, objectFit: "contain", borderRadius: 8, marginBottom: 12, display: "block", background: "#f0f2f5" },
  actions: { display: "flex", gap: 10, alignItems: "center", borderTop: "1px solid #f0f2f5", paddingTop: 10, marginTop: 4 },
  likeBtn: { border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, padding: "4px 8px", borderRadius: 6 },
  commentBtn: { border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, padding: "4px 8px", borderRadius: 6, color: "#65676b" },
  deleteBtn: { border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "#e41749", marginLeft: "auto" },
};

export default function PostCard({ post, onUpdate, onDelete }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [titleHovered, setTitleHovered] = useState(false);

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/api/posts/${post.id}/like`);
      onUpdate(data);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    await api.delete(`/api/posts/${post.id}`);
    onDelete(post.id);
  };

  const goToDetail = () => navigate(`/posts/${post.id}`);

  const initials = post.author.name.charAt(0).toUpperCase();
  const dateStr = new Date(post.created_at).toLocaleString();
  const commentCount = post.comment_count ?? 0;

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div style={s.authorLink} onClick={() => navigate(`/users/${post.author.id}`)}>
          {post.author.avatar_url
            ? <img src={post.author.avatar_url} alt="" style={s.avatar} />
            : <div style={s.avatarPlaceholder}>{initials}</div>
          }
          <div>
            <div style={s.name}>{post.author.name}</div>
            {post.author.username && <div style={s.username}>@{post.author.username}</div>}
          </div>
        </div>
        <div style={{ ...s.date, marginLeft: "auto" }}>{dateStr}</div>
      </div>

      {post.title && (
        <div
          style={{ ...s.title, ...(titleHovered ? s.titleHover : {}) }}
          onClick={goToDetail}
          onMouseEnter={() => setTitleHovered(true)}
          onMouseLeave={() => setTitleHovered(false)}
        >
          {post.title}
        </div>
      )}

      {post.content && post.content.trim() && (
        <p style={s.content}>{post.content}</p>
      )}

      {post.link_url && (
        <a href={post.link_url} target="_blank" rel="noopener noreferrer" style={s.linkBox}>
          🔗 {post.link_url}
        </a>
      )}

      {post.media_url && post.media_type === "image" && (
        <img src={post.media_url} alt="" style={s.media} />
      )}
      {post.media_url && post.media_type === "video" && (
        <video src={post.media_url} style={s.media} controls />
      )}

      <div style={s.actions}>
        <button
          style={{ ...s.likeBtn, color: post.liked_by_me ? "#1877f2" : "#65676b" }}
          onClick={handleLike}
          disabled={loading}
        >
          {post.liked_by_me ? "♥" : "♡"} {post.like_count} {post.like_count === 1 ? "Like" : "Likes"}
        </button>

        <button style={s.commentBtn} onClick={goToDetail}>
          💬 {commentCount} {commentCount === 1 ? "Comment" : "Comments"}
        </button>

        {user?.id === post.author.id && (
          <button style={s.deleteBtn} onClick={handleDelete}>Delete</button>
        )}
      </div>
    </div>
  );
}
