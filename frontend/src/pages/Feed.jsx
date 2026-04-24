import { useEffect, useRef, useState } from "react";
import api from "../api/client";
import PostCard from "../components/PostCard";

const s = {
  page: { maxWidth: 600, margin: "0 auto", padding: "24px 16px" },
  compose: { background: "#fff", borderRadius: 8, padding: 16, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  textarea: { width: "100%", border: "1px solid #ccd0d5", borderRadius: 6, padding: "10px 12px", fontSize: 15, resize: "vertical", minHeight: 80, fontFamily: "inherit", boxSizing: "border-box" },
  bottom: { display: "flex", alignItems: "center", gap: 10, marginTop: 8 },
  btn: { padding: "8px 20px", background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 14 },
  attachBtn: { padding: "8px 12px", background: "#e7f3ff", color: "#1877f2", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 13 },
  removeBtn: { padding: "4px 8px", background: "none", border: "none", color: "#e41749", cursor: "pointer", fontSize: 12 },
  preview: { marginTop: 10, position: "relative", display: "inline-block" },
  previewImg: { maxWidth: "100%", maxHeight: 200, borderRadius: 6, display: "block" },
  previewVideo: { maxWidth: "100%", maxHeight: 200, borderRadius: 6, display: "block" },
  error: { color: "#e41749", fontSize: 13, marginTop: 8 },
  empty: { textAlign: "center", color: "#65676b", marginTop: 40 },
  uploading: { fontSize: 13, color: "#65676b" },
};

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileType, setFileType] = useState(null); // "image" | "video"
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get("/api/posts").then(({ data }) => setPosts(data));
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const isImage = f.type.startsWith("image/");
    const isVideo = f.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setPostError("Only images and videos are allowed");
      return;
    }
    setFile(f);
    setFileType(isImage ? "image" : "video");
    setFilePreview(URL.createObjectURL(f));
    setPostError("");
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim() && !file) return;
    setPosting(true);
    setPostError("");

    try {
      let media_url = null;
      let media_type = null;

      if (file) {
        const form = new FormData();
        form.append("file", file);
        const { data: uploaded } = await api.post("/api/media/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        media_url = uploaded.url;
        media_type = uploaded.media_type;
      }

      const { data } = await api.post("/api/posts", {
        content: content.trim() || " ",
        media_url,
        media_type,
      });
      setPosts(prev => [data, ...prev]);
      setContent("");
      removeFile();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setPostError(Array.isArray(detail) ? detail.map(d => d.msg).join(", ") : detail || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const handleUpdate = (updated) => setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
  const handleDelete = (id) => setPosts(prev => prev.filter(p => p.id !== id));

  const canPost = (content.trim() || file) && !posting;

  return (
    <div style={s.page}>
      <div style={s.compose}>
        <form onSubmit={handlePost}>
          <textarea
            style={s.textarea}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind?"
          />

          {filePreview && (
            <div style={s.preview}>
              {fileType === "image"
                ? <img src={filePreview} alt="preview" style={s.previewImg} />
                : <video src={filePreview} style={s.previewVideo} controls />
              }
              <button type="button" style={s.removeBtn} onClick={removeFile}>✕ Remove</button>
            </div>
          )}

          {postError && <div style={s.error}>{postError}</div>}

          <div style={s.bottom}>
            <button style={s.btn} type="submit" disabled={!canPost}>
              {posting ? "Posting..." : "Post"}
            </button>
            <button type="button" style={s.attachBtn} onClick={() => fileInputRef.current?.click()}>
              📎 Photo / Video
            </button>
            {posting && file && <span style={s.uploading}>Uploading...</span>}
          </div>
        </form>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
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
