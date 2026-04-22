import { useEffect, useRef, useState } from "react";
import api from "../api/client";
import PostCard from "../components/PostCard";

const s = {
  page: { maxWidth: 600, margin: "0 auto", padding: "24px 16px" },
  compose: { background: "#fff", borderRadius: 8, padding: 16, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  textarea: { width: "100%", border: "1px solid #ccd0d5", borderRadius: 6, padding: "10px 12px", fontSize: 15, resize: "vertical", minHeight: 80, fontFamily: "inherit" },
  btn: { marginTop: 8, padding: "8px 20px", background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 14 },
  error: { color: "#e41749", fontSize: 13, marginTop: 8 },
  empty: { textAlign: "center", color: "#65676b", marginTop: 40 },
};

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    api.get("/api/posts").then(({ data }) => setPosts(data));
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    setPostError("");
    try {
      const { data } = await api.post("/api/posts", { content });
      setPosts(prev => [data, ...prev]);
      setContent("");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setPostError(Array.isArray(detail) ? detail.map(d => d.msg).join(", ") : detail || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const handleUpdate = (updated) => {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleDelete = (id) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div style={s.page}>
      <div style={s.compose}>
        <form onSubmit={handlePost}>
          <textarea
            ref={textareaRef}
            style={s.textarea}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind?"
          />
          {postError && <div style={s.error}>{postError}</div>}
          <button style={s.btn} type="submit" disabled={posting || !content.trim()}>
            {posting ? "Posting..." : "Post"}
          </button>
        </form>
      </div>

      {posts.length === 0
        ? <div style={s.empty}>No posts yet. Be the first!</div>
        : posts.map(post => (
            <PostCard key={post.id} post={post} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))
      }
    </div>
  );
}
