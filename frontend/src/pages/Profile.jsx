import { useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const s = {
  page: { maxWidth: 500, margin: "0 auto", padding: "32px 16px" },
  card: { background: "#fff", borderRadius: 8, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  avatarWrap: { display: "flex", justifyContent: "center", marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: "50%", objectFit: "cover" },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: "50%", background: "#1877f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 32 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 24, textAlign: "center" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 14, fontWeight: 600, marginBottom: 4 },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #ccd0d5", borderRadius: 6, fontSize: 15 },
  staticVal: { padding: "10px 12px", fontSize: 15, color: "#444" },
  btn: { width: "100%", padding: 12, background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  success: { color: "#42b72a", fontSize: 14, marginBottom: 12 },
  error: { color: "#e41749", fontSize: 14, marginBottom: 12 },
};

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    setSaving(true);
    try {
      const { data } = await api.put("/api/users/me", { name, avatar_url: avatarUrl || null });
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

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.avatarWrap}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={s.avatar} />
            : <div style={s.avatarPlaceholder}>{initials}</div>
          }
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
            <label style={s.label}>Name</label>
            <input style={s.input} type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Avatar URL (optional)</label>
            <input style={s.input} type="url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.jpg" />
          </div>
          <button style={s.btn} type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
