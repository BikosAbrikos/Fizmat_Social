import { useRef, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const CameraIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

function SectionHeading({ children, theme }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      color: theme.textSub,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      padding: "14px 0 8px",
      borderBottom: `1px solid ${theme.border}`,
      marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [age, setAge] = useState(user?.age ?? "");
  const [grade, setGrade] = useState(user?.grade || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [futureMajor, setFutureMajor] = useState(user?.future_major || "");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [smartFeed, setSmartFeed] = useState(user?.smart_feed ?? false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [hovering, setHovering] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadError("");
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { setUploadError("Only JPEG, PNG, or WebP images allowed."); return; }
    if (file.size > 8 * 1024 * 1024) { setUploadError("Photo must be under 8 MB."); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data: upload } = await api.post("/api/media/upload-avatar", form);
      const { data: updated } = await api.put("/api/users/me", { avatar_url: upload.url });
      setUser(updated);
      setAvatarUrl(upload.url);
      setMsg("Photo updated!");
    } catch (err) {
      setUploadError(err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(""); setError("");
    setSaving(true);
    try {
      const { data } = await api.put("/api/users/me", {
        name, username: username || null, avatar_url: avatarUrl || null,
        age: age !== "" ? Number(age) : null, grade: grade || null,
        bio: bio || null, future_major: futureMajor || null,
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
  const showOverlay = hovering || uploading;

  const input = {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: 4,
    fontSize: 14,
    background: theme.input,
    color: theme.text,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px 80px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 20 }}>Settings</div>

      {/* Avatar */}
      <div style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 4,
        padding: "20px 24px",
        marginBottom: 12,
      }}>
        <SectionHeading theme={theme}>Profile Photo</SectionHeading>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{ position: "relative", cursor: uploading ? "wait" : "pointer", borderRadius: "50%", flexShrink: 0 }}
            onClick={uploading ? undefined : () => fileInputRef.current?.click()}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", display: "block" }} />
              : <div style={{ width: 72, height: 72, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 28 }}>{initials}</div>
            }
            {showOverlay && (
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {uploading
                  ? <div style={{ width: 24, height: 24, border: "3px solid #fff", borderTop: "3px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  : <CameraIcon />
                }
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, color: theme.text, fontWeight: 600 }}>Click to change photo</div>
            <div style={{ fontSize: 12, color: theme.textSub, marginTop: 2 }}>JPEG, PNG, WebP · max 8 MB</div>
            {uploadError && <div style={{ fontSize: 12, color: theme.danger, marginTop: 4 }}>{uploadError}</div>}
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleAvatarChange} />
      </div>

      {/* Profile info */}
      <div style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 4,
        padding: "20px 24px",
        marginBottom: 12,
      }}>
        <SectionHeading theme={theme}>Profile Info</SectionHeading>

        <form onSubmit={handleSave}>
          {msg && <div style={{ fontSize: 13, color: theme.success, marginBottom: 12, fontWeight: 600 }}>{msg}</div>}
          {error && <div style={{ fontSize: 13, color: theme.danger, marginBottom: 12 }}>{error}</div>}

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Email</label>
            <div style={{ fontSize: 14, color: theme.textSub, padding: "9px 0" }}>{user?.email}</div>
          </div>

          {[
            { id: "name", lbl: "Full Name", val: name, setter: setName, type: "text", req: true },
            { id: "username", lbl: "Username", val: username, setter: setUsername, type: "text", ph: "e.g. arsen.yessentayev" },
            { id: "age", lbl: "Age", val: age, setter: setAge, type: "number", ph: "e.g. 17" },
            { id: "grade", lbl: "Grade", val: grade, setter: setGrade, type: "text", ph: "e.g. 11H", max: 10 },
            { id: "future_major", lbl: "Future Major", val: futureMajor, setter: setFutureMajor, type: "text", ph: "e.g. Engineer", max: 100 },
          ].map(({ id, lbl, val, setter, type, ph, req, max }) => (
            <div key={id} style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                {lbl}
              </label>
              <input
                style={input}
                type={type}
                value={val}
                onChange={e => setter(e.target.value)}
                placeholder={ph}
                required={req}
                maxLength={max}
                min={type === "number" ? 10 : undefined}
                max={type === "number" ? 99 : undefined}
                onFocus={e => e.currentTarget.style.borderColor = theme.accent}
                onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
              />
            </div>
          ))}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              About Me (max 150 chars)
            </label>
            <textarea
              style={{ ...input, resize: "vertical", minHeight: 72 }}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="A few words about yourself..."
              maxLength={150}
              onFocus={e => e.currentTarget.style.borderColor = theme.accent}
              onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
            />
            <div style={{ fontSize: 11, color: theme.textSub, textAlign: "right", marginTop: 2 }}>{bio.length}/150</div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%", padding: "10px 0", background: theme.accent, color: "#fff",
              border: "none", borderRadius: 20, fontSize: 14, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "inherit",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Feed */}
      <div style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 4,
        padding: "20px 24px",
        marginBottom: 12,
      }}>
        <SectionHeading theme={theme}>Feed</SectionHeading>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, paddingRight: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>Smart Feed</div>
            <div style={{ fontSize: 12, color: theme.textSub, marginTop: 2, lineHeight: 1.5 }}>
              Rank posts by popularity and hide ones you've already seen. Posts won't repeat until you reset.
            </div>
          </div>
          <button
            onClick={async () => {
              const next = !smartFeed;
              setSmartFeed(next);
              try {
                const { data } = await api.put("/api/users/me", { smart_feed: next });
                setUser(data);
              } catch {
                setSmartFeed(!next); // revert on failure
              }
            }}
            style={{
              position: "relative",
              width: 48,
              height: 26,
              background: smartFeed ? theme.accent : theme.border,
              borderRadius: 13,
              border: "none",
              cursor: "pointer",
              transition: "background 0.2s",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute",
              top: 3,
              left: smartFeed ? 25 : 3,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 4,
        padding: "20px 24px",
      }}>
        <SectionHeading theme={theme}>Appearance</SectionHeading>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>Dark Mode</div>
            <div style={{ fontSize: 12, color: theme.textSub, marginTop: 2 }}>Switch between light and dark themes</div>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              position: "relative",
              width: 48,
              height: 26,
              background: isDark ? theme.accent : theme.border,
              borderRadius: 13,
              border: "none",
              cursor: "pointer",
              transition: "background 0.2s",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute",
              top: 3,
              left: isDark ? 25 : 3,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
            }}>
              {isDark ? "🌙" : "☀️"}
            </span>
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
