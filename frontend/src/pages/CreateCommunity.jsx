import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useIsMobile } from "../hooks/useIsMobile";

const s = {
  page: { maxWidth: 560, margin: "0 auto", padding: "32px 16px" },
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 24, color: "#1c1e21" },
  card: {
    background: "#fff", borderRadius: 8, padding: "28px 24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  field: { marginBottom: 20 },
  label: { display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6, color: "#1c1e21" },
  input: {
    width: "100%", padding: "10px 12px", border: "1px solid #ccd0d5",
    borderRadius: 6, fontSize: 15, fontFamily: "inherit", outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%", padding: "10px 12px", border: "1px solid #ccd0d5",
    borderRadius: 6, fontSize: 14, fontFamily: "inherit", outline: "none",
    resize: "vertical", minHeight: 100, boxSizing: "border-box",
  },
  charCount: { fontSize: 12, color: "#65676b", textAlign: "right", marginTop: 3 },
  toggleWrap: { display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1.5px solid #1877f2", width: "fit-content" },
  toggleBtn: (active) => ({
    padding: "9px 24px", border: "none", cursor: "pointer", fontWeight: 700,
    fontSize: 14, fontFamily: "inherit",
    background: active ? "#1877f2" : "#fff",
    color: active ? "#fff" : "#1877f2",
    transition: "background 0.15s, color 0.15s",
  }),
  hint: { fontSize: 12, color: "#65676b", marginTop: 6 },
  submitBtn: {
    width: "100%", padding: "12px 0", background: "#1877f2", color: "#fff",
    border: "none", borderRadius: 6, fontSize: 15, fontWeight: 700,
    cursor: "pointer", marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.55, cursor: "not-allowed" },
  cancelBtn: {
    width: "100%", padding: "10px 0", background: "none", color: "#65676b",
    border: "none", fontSize: 14, cursor: "pointer", marginTop: 6, fontFamily: "inherit",
  },
  error: { color: "#e41749", fontSize: 13, marginBottom: 14 },
};

export default function CreateCommunity() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      setError("Community name must be at least 3 characters.");
      return;
    }
    if (trimmedName.length > 50) {
      setError("Community name must be at most 50 characters.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/communities", {
        name: trimmedName,
        description: description.trim() || null,
        is_private: isPrivate,
      });
      navigate(`/communities/${data.id}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : detail || "Failed to create community");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = name.trim().length >= 3 && !submitting;

  return (
    <div style={{ ...s.page, paddingBottom: isMobile ? 96 : 32 }}>
      <div style={s.heading}>Create a Community</div>
      <div style={s.card}>
        <form onSubmit={handleSubmit}>
          {error && <div style={s.error}>{error}</div>}

          <div style={s.field}>
            <label style={s.label}>Community Name *</label>
            <input
              style={s.input}
              type="text"
              placeholder="e.g. Physics Club"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              autoFocus
              maxLength={50}
            />
            <div style={s.charCount}>{name.length}/50</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Description (optional)</label>
            <textarea
              style={s.textarea}
              placeholder="What is this community about?"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              maxLength={300}
            />
            <div style={s.charCount}>{description.length}/300</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Privacy</label>
            <div style={s.toggleWrap}>
              <button
                type="button"
                style={s.toggleBtn(!isPrivate)}
                onClick={() => setIsPrivate(false)}
              >
                🌐 Public
              </button>
              <button
                type="button"
                style={s.toggleBtn(isPrivate)}
                onClick={() => setIsPrivate(true)}
              >
                🔒 Private
              </button>
            </div>
            <div style={s.hint}>
              {isPrivate
                ? "Private: only approved members can see posts and join."
                : "Public: anyone can join and see posts."}
            </div>
          </div>

          <button
            type="submit"
            style={{ ...s.submitBtn, ...(canSubmit ? {} : s.submitBtnDisabled) }}
            disabled={!canSubmit}
          >
            {submitting ? "Creating..." : "Create Community"}
          </button>
          <button type="button" style={s.cancelBtn} onClick={() => navigate("/communities")}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
