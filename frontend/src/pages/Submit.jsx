import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const TABS = ["Text", "Images & Video", "Link"];
const MAX_W = 2000;
const MAX_H = 2000;

export default function Submit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { theme } = useTheme();
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
  const [myCommunities, setMyCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState("");

  useEffect(() => {
    if (!user) return;
    api.get("/api/communities/me/joined")
      .then(({ data }) => {
        setMyCommunities(data);
        const paramId = searchParams.get("communityId");
        if (paramId) {
          const found = data.find((c) => String(c.id) === paramId);
          if (found) setSelectedCommunityId(String(found.id));
        }
      })
      .catch(() => {});
  }, [user?.id]);

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
            reject(`Video too large. Max: ${MAX_W}×${MAX_H}px.`);
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

  useEffect(() => {
    return () => { if (filePreview) URL.revokeObjectURL(filePreview); };
  }, [filePreview]);

  const removeFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(null); setFilePreview(null); setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setSubmitting(true); setError("");
    try {
      let media_url = null, media_type = null;
      if (tab === "Images & Video" && file) {
        const form = new FormData();
        form.append("file", file);
        const { data: uploaded } = await api.post("/api/media/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
        media_url = uploaded.url;
        media_type = uploaded.media_type;
      }
      await api.post("/api/posts", {
        title: title.trim(),
        content: tab === "Text" ? (body.trim() || null) : null,
        link_url: tab === "Link" ? (linkUrl.trim() || null) : null,
        media_url, media_type,
        community_id: selectedCommunityId ? parseInt(selectedCommunityId, 10) : null,
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

  const input = {
    width: "100%",
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: 4,
    padding: "9px 12px",
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
    background: theme.input,
    color: theme.text,
  };

  return (
    <div style={{ maxWidth: 740, margin: "0 auto", padding: "20px 14px 80px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 16 }}>Create Post</div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4, overflow: "hidden" }}>

          {/* Title */}
          <div style={{ padding: "14px 14px 0" }}>
            <input
              style={input}
              placeholder="Title *"
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 300))}
              autoFocus
              onFocus={e => e.currentTarget.style.borderColor = theme.accent}
              onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
            />
            <div style={{ fontSize: 11, color: theme.textSub, textAlign: "right", marginTop: 3 }}>{title.length}/300</div>
          </div>

          {/* Community selector */}
          {myCommunities.length > 0 && (
            <div style={{ padding: "8px 14px 0" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                Post to
              </label>
              <select
                style={{ ...input, cursor: "pointer" }}
                value={selectedCommunityId}
                onChange={e => setSelectedCommunityId(e.target.value)}
              >
                <option value="">General Feed</option>
                {myCommunities.map(c => (
                  <option key={c.id} value={String(c.id)}>c/{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${theme.border}`, margin: "12px 0 0" }}>
            {TABS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  padding: "9px 16px",
                  fontSize: 13,
                  fontWeight: tab === t ? 700 : 500,
                  color: tab === t ? theme.accent : theme.textSub,
                  borderBottom: tab === t ? `2px solid ${theme.accent}` : "2px solid transparent",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  borderBottom: tab === t ? `2px solid ${theme.accent}` : "2px solid transparent",
                  fontFamily: "inherit",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: 14 }}>
            {tab === "Text" && (
              <textarea
                style={{ ...input, resize: "vertical", minHeight: 120 }}
                placeholder="Body text (optional)"
                value={body}
                onChange={e => setBody(e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = theme.accent}
                onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
              />
            )}

            {tab === "Images & Video" && (
              <>
                {!file ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: "10px 18px",
                      background: "none",
                      color: theme.accent,
                      border: `1.5px dashed ${theme.accent}`,
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    + Upload Photo or Video
                  </button>
                ) : (
                  <div>
                    {fileType === "image"
                      ? <img src={filePreview} alt="preview" style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 4, display: "block" }} />
                      : <video src={filePreview} style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 4, display: "block" }} controls />
                    }
                    <button
                      type="button"
                      onClick={removeFile}
                      style={{ background: "none", border: "none", color: theme.danger, cursor: "pointer", fontSize: 12, marginTop: 6, fontFamily: "inherit" }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleFileChange} />
              </>
            )}

            {tab === "Link" && (
              <>
                <input
                  style={input}
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  onFocus={e => e.currentTarget.style.borderColor = theme.accent}
                  onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
                />
                <div style={{ fontSize: 12, color: theme.textSub, marginTop: 6 }}>Paste a URL to share with your post</div>
              </>
            )}
          </div>

          {error && (
            <div style={{ color: theme.danger, fontSize: 13, padding: "0 14px 10px" }}>{error}</div>
          )}

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "12px 14px", borderTop: `1px solid ${theme.border}` }}>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{ padding: "8px 20px", background: "none", color: theme.textSub, border: `1px solid ${theme.border}`, borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canPost}
              style={{
                padding: "8px 24px",
                background: canPost ? theme.accent : theme.border,
                color: canPost ? "#fff" : theme.textSub,
                border: "none",
                borderRadius: 20,
                fontWeight: 700,
                fontSize: 13,
                cursor: canPost ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
