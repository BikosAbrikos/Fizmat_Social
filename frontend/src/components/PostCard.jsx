import { useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const s = {
  card: { background: "#fff", borderRadius: 8, padding: 20, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: "50%", objectFit: "cover", background: "#e4e6eb" },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: "50%", background: "#1877f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 },
  name: { fontWeight: 600, fontSize: 15 },
  username: { fontSize: 12, color: "#65676b" },
  date: { fontSize: 12, color: "#65676b" },
  content: { fontSize: 15, lineHeight: 1.5, marginBottom: 12 },
  actions: { display: "flex", gap: 12, alignItems: "center" },
  likeBtn: { border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, padding: "4px 8px", borderRadius: 6 },
  deleteBtn: { border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "#e41749", marginLeft: "auto" },
};

export default function PostCard({ post, onUpdate, onDelete }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

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

  const initials = post.author.name.charAt(0).toUpperCase();
  const dateStr = new Date(post.created_at).toLocaleString();

  return (
    <div style={s.card}>
      <div style={s.header}>
        {post.author.avatar_url
          ? <img src={post.author.avatar_url} alt="" style={s.avatar} />
          : <div style={s.avatarPlaceholder}>{initials}</div>
        }
        <div>
          <div style={s.name}>{post.author.name}</div>
          {post.author.username && <div style={s.username}>@{post.author.username}</div>}
          <div style={s.date}>{dateStr}</div>
        </div>
      </div>
      <p style={s.content}>{post.content}</p>
      <div style={s.actions}>
        <button
          style={{ ...s.likeBtn, color: post.liked_by_me ? "#1877f2" : "#65676b" }}
          onClick={handleLike}
          disabled={loading}
        >
          {post.liked_by_me ? "♥" : "♡"} {post.like_count} {post.like_count === 1 ? "Like" : "Likes"}
        </button>
        {user?.id === post.author.id && (
          <button style={s.deleteBtn} onClick={handleDelete}>Delete</button>
        )}
      </div>
    </div>
  );
}
