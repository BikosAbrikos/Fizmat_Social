import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

const TABS = ["Text", "Images & Video", "Link"];

const s = {
  page: { maxWidth: 740, margin: "0 auto", padding: "32px 16px" },
  heading: { fontSize: 20, fontWeight: 700, marginBottom: 20 },
  card: { background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", overflow: "hidden" },

  // title row
  titleRow: { padding: "16px 16px 0" },
  titleInput: { width: "100%", border: "1px solid #ccd0d5", borderRadius: 6, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", outline: "none" },
  titleCount: { fontSize: 12, color: "#65676b", textAlign: "right", marginTop: 4 },

  // tabs
  tabBar: { display: "flex", borderBottom: "1px solid #e4e6eb", margin: "14px 0 0" },
  tab: (active) => ({
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: active ? 700 : 500,
    color: active ? "#1877f2" : "#65676b",
    borderBottom: active ? "2px solid #1877f2" : "2px solid transparent",
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid #1877f2" : "2px solid transparent",
  }),

  // body area
  body: { padding: 16 },
  textarea: { width: "100%", border: "1px solid #ccd0d5", borderRadius: 6, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", resize: "vertical", minHeight: 140, boxSizing: "border-box", outline: "none" },
  linkInput: { width: "100%", border: "1px solid #ccd0d5", borderRadius: 6, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none" },
  linkHint: { fontSize: 12, color: "#65676b", marginTop: 6 },

  // media
  attachBtn: { padding: "9px 16px", background: "#e7f3ff", color: "#1877f2", border: "1px dashed #1877f2", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 14 },
  preview: { marginTop: 12, position: "relative" },
  previewImg: { maxWidth: "100%", maxHeight: 300, borderRadius: 6, display: "block" },
  previewVideo: { maxWidth: "100%", maxHeight: 300, borderRadius: 6, display: "block" },
  removeBtn: { background: "none", border: "none", color: "#e41749", cursor: "pointer", fontSize: 12, marginTop: 6 },

  // footer
  footer: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "12px 16px", borderTop: "1px solid #e4e6eb" },
  cancelBtn: { padding: "9px 20px", background: "#e4e6eb", color: "#1c1e21", border: "none", borderRadius: 20, fontWeight: 700, cursor: "pointer", fontSize: 14 },
  postBtn: { padding: "9px 24px", background: "#1877f2", color: "#fff", border: "none", borderRadius: 20, fontWeight: 700, cursor: "pointer", fontSize: 14 },
  postBtnDisabled: { opacity: 0.5, cursor: "not-allowed" },

  error: { color: "#e41749", fontSize: 13, padding: "0 16px 12px" },
};

const MAX_W = 2000;
const MAX_H = 2000;

export default function Submit() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("Text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const checkDimensions = (f, type) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(f);
      if (type === "image") {
        const img = new Image();
        img.onload = () => {
          if (img.naturalWidth > MAX_W || img.naturalHeight > MAX_H) {
            URL.revokeObjectURL(url);
            reject(`Image too large (${img.naturalWidth}×${img.naturalHeight}px). Max: ${MAX_W}×${MAX_H}px.`);
          } else resolve(url);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject("Could not read image."); };
        img.src = url;
      } else {
        const vid = document.createElement("video");
        vid.onloadedmetadata = () => {
          if (vid.videoWidth > MAX_W || vid.videoHeight > MAX_H) {
            URL.revokeObjectURL(url);
            reject(`Video too large (${vid.videoWidth}×${vid.videoHeight}px). Max: ${MAX_W}×${MAX_H}px.`);
          } else resolve(url);
        };
        vid.onerror = () => { URL.revokeObjectURL(url); reject("Could not read video."); };
        vid.src = url;
      }
    });

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const isImage = f.type.startsWith("image/");
    const isVideo = f.type.startsWith("video/");
    if (!isImage && !isVideo) { setError("Only images and videos are allowed"); return; }
    const type = isImage ? "image" : "video";
    try {
      const previewUrl = await checkDimensions(f, type);
      setFile(f); setFileType(type); setFilePreview(previewUrl); setError("");
    } catch (msg) {
      setError(msg);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = () => {
    setFile(null); setFilePreview(null); setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setSubmitting(true);
    setError("");
    try {
      let media_url = null;
      let media_type = null;

      if (tab === "Images & Video" && file) {
        const form = new FormData();
        form.append("file", file);
        const { data: uploaded } = await api.post("/api/media/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        media_url = uploaded.url;
        media_type = uploaded.media_type;
      }

      await api.post("/api/posts", {
        title: title.trim(),
        content: tab === "Text" ? (body.trim() || null) : null,
        link_url: tab === "Link" ? (linkUrl.trim() || null) : null,
        media_url,
        media_type,
      });

      navigate("/");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map(d => d.msg).join(", ") : detail || "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  const canPost = title.trim().length > 0 && !submitting;

  return (
    <div style={s.page}>
      <div style={s.heading}>Create Post</div>
      <form onSubmit={handleSubmit}>
        <div style={s.card}>

          {/* Title */}
          <div style={s.titleRow}>
            <input
              style={s.titleInput}
              placeholder="Title *"
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 300))}
              autoFocus
            />
            <div style={s.titleCount}>{title.length}/300</div>
          </div>

          {/* Tabs */}
          <div style={s.tabBar}>
            {TABS.map(t => (
              <button key={t} type="button" style={s.tab(tab === t)} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={s.body}>
            {tab === "Text" && (
              <textarea
                style={s.textarea}
                placeholder="Body text (optional)"
                value={body}
                onChange={e => setBody(e.target.value)}
              />
            )}

            {tab === "Images & Video" && (
              <>
                {!file ? (
                  <button type="button" style={s.attachBtn} onClick={() => fileInputRef.current?.click()}>
                    + Upload Photo or Video
                  </button>
                ) : (
                  <div style={s.preview}>
                    {fileType === "image"
                      ? <img src={filePreview} alt="preview" style={s.previewImg} />
                      : <video src={filePreview} style={s.previewVideo} controls />
                    }
                    <button type="button" style={s.removeBtn} onClick={removeFile}>✕ Remove</button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </>
            )}

            {tab === "Link" && (
              <>
                <input
                  style={s.linkInput}
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                />
                <div style={s.linkHint}>Paste a URL to share a link with your post</div>
              </>
            )}
          </div>

          {error && <div style={s.error}>{error}</div>}

          {/* Footer */}
          <div style={s.footer}>
            <button type="button" style={s.cancelBtn} onClick={() => navigate("/")}>Cancel</button>
            <button type="submit" style={{ ...s.postBtn, ...(canPost ? {} : s.postBtnDisabled) }} disabled={!canPost}>
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
