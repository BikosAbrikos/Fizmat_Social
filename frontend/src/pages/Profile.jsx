import { useState, useRef } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const s = {
  page: { maxWidth: 500, margin: "0 auto", padding: "32px 16px" },
  card: { background: "#fff", borderRadius: 8, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  avatarWrap: { display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24, gap: 8 },
  avatarBtn: { position: "relative", cursor: "pointer", borderRadius: "50%", display: "inline-block" },
  avatar: { width: 96, height: 96, borderRadius: "50%", objectFit: "cover", display: "block" },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: "50%", background: "#1877f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 36 },
  avatarOverlay: { position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" },
  avatarHint: { fontSize: 12, color: "#65676b" },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 24, textAlign: "center" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 14, fontWeight: 600, marginBottom: 4 },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #ccd0d5", borderRadius: 6, fontSize: 15, boxSizing: "border-box" },
  staticVal: { padding: "10px 12px", fontSize: 15, color: "#444" },
  btn: { width: "100%", padding: 12, background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  success: { color: "#42b72a", fontSize: 14, marginBottom: 12 },
  error: { color: "#e41749", fontSize: 14, marginBottom: 12 },
  uploadErr: { color: "#e41749", fontSize: 12, marginTop: 4 },
};

const CameraIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [age, setAge] = useState(user?.age ?? "");
  const [grade, setGrade] = useState(user?.grade || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [futureMajor, setFutureMajor] = useState(user?.future_major || "");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [hoveringAvatar, setHoveringAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploadError("");
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only JPEG, PNG, or WebP images allowed.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Photo must be under 8 MB.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data: upload } = await api.post("/api/media/upload-avatar", form);
      const newUrl = upload.url;

      const { data: updated } = await api.put("/api/users/me", { avatar_url: newUrl });
      setUser(updated);
      setAvatarUrl(newUrl);
      setMsg("Profile photo updated!");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setUploadError(detail || "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    setSaving(true);
    try {
      const { data } = await api.put("/api/users/me", {
        name,
        username: username || null,
        avatar_url: avatarUrl || null,
        age: age !== "" ? Number(age) : null,
        grade: grade || null,
        bio: bio || null,
        future_major: futureMajor || null,
      });
      setUser(data);
      setMsg("Profile updated!");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map(d => d.msg).join(", ") : detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name?.charAt(0).toUpperCase() || "?";
  const showOverlay = hoveringAvatar || uploading;

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.avatarWrap}>
          <div
            style={s.avatarBtn}
            onClick={uploading ? undefined : handleAvatarClick}
            onMouseEnter={() => setHoveringAvatar(true)}
            onMouseLeave={() => setHoveringAvatar(false)}
            title="Change profile photo"
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={s.avatar} />
              : <div style={s.avatarPlaceholder}>{initials}</div>
            }
            {showOverlay && (
              <div style={s.avatarOverlay}>
                {uploading
                  ? <div style={{ width: 28, height: 28, border: "3px solid #fff", borderTop: "3px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  : <CameraIcon />
                }
              </div>
            )}
          </div>
          <span style={s.avatarHint}>Click photo to change · JPEG, PNG, WebP · max 8 MB</span>
          {uploadError && <div style={s.uploadErr}>{uploadError}</div>}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={handleAvatarChange}
          />
        </div>
        <h1 style={s.title}>My Profile</h1>
        <form onSubmit={handleSave}>
          {msg && <div style={s.success}>{msg}</div>}
          {error && <div style={s.error}>{error}</div>}
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <div style={s.staticVal}>{user?.email}</div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Full Name</label>
            <input style={s.input} type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Username</label>
            <input style={s.input} type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. arsen.yessentayev" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Age (optional)</label>
            <input style={s.input} type="number" min={10} max={99} value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 17" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Grade (optional)</label>
            <input style={s.input} type="text" value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. 11H" maxLength={10} />
          </div>
          <div style={s.field}>
            <label style={s.label}>About me (optional, max 150 characters)</label>
            <textarea
              style={{ ...s.input, resize: "vertical", minHeight: 72 }}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="A few words about yourself..."
              maxLength={150}
            />
            <div style={{ fontSize: 12, color: "#65676b", marginTop: 3 }}>{bio.length}/150</div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Future major (optional)</label>
            <input style={s.input} type="text" value={futureMajor} onChange={e => setFutureMajor(e.target.value)} placeholder="e.g. Engineer" maxLength={100} />
          </div>
          <button style={s.btn} type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
