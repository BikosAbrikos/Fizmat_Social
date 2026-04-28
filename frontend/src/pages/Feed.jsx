import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import PostCard from "../components/PostCard";

const s = {
  page: { maxWidth: 600, margin: "0 auto", padding: "24px 16px" },
  createBtn: {
    display: "block", width: "100%", padding: "12px 0",
    background: "#fff", border: "1px solid #ccd0d5", borderRadius: 8,
    fontSize: 15, color: "#65676b", textAlign: "left", paddingLeft: 16,
    cursor: "pointer", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    fontFamily: "inherit",
  },
  empty: { textAlign: "center", color: "#65676b", marginTop: 40 },
  error: { textAlign: "center", color: "#e41749", marginTop: 40, fontSize: 14 },
  loading: { textAlign: "center", color: "#65676b", marginTop: 40 },
};

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/posts")
      .then(({ data }) => setPosts(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = (updated) => setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
  const handleDelete = (id) => setPosts(prev => prev.filter(p => p.id !== id));

  return (
    <div style={s.page}>
      <button style={s.createBtn} onClick={() => navigate("/submit")}>
        ✏️ Create Post
      </button>

      {loading && <div style={s.loading}>Loading...</div>}
      {error && <div style={s.error}>Failed to load posts. Please refresh.</div>}
      {!loading && !error && posts.length === 0 && (
        <div style={s.empty}>No posts yet. Be the first!</div>
      )}
      {posts.map(post => (
        <PostCard key={post.id} post={post} onUpdate={handleUpdate} onDelete={handleDelete} />
      ))}
    </div>
  );
}
