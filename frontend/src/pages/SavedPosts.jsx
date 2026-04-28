import { useEffect, useState } from "react";
import api from "../api/client";
import PostCard from "../components/PostCard";
import { useTheme } from "../context/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";

export default function SavedPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  useEffect(() => {
    api.get("/api/posts/saved")
      .then(({ data }) => setPosts(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = (updated) => {
    if (!updated.saved_by_me) {
      // Unsaved — remove from this list
      setPosts(prev => prev.filter(p => p.id !== updated.id));
    } else {
      setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleDelete = (id) => setPosts(prev => prev.filter(p => p.id !== id));

  return (
    <div style={{
      maxWidth: 680,
      margin: "0 auto",
      padding: isMobile ? "16px 10px 80px" : "24px 20px",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 22 }}>🔖</span>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: theme.text }}>
          Saved Posts
        </h2>
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: theme.textSub, padding: "40px 0", fontSize: 14 }}>
          Loading...
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "48px 16px",
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: 4,
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔖</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: theme.text, marginBottom: 6 }}>
            No saved posts yet
          </div>
          <div style={{ fontSize: 13, color: theme.textSub }}>
            Hit the Save button on any post to bookmark it here.
          </div>
        </div>
      )}

      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
