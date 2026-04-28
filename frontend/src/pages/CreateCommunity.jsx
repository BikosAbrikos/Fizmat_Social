import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";

export default function CreateCommunity() {
  const { theme } = useTheme();
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
    if (trimmedName.length < 3) { setError("Community name must be at least 3 characters."); return; }
    if (trimmedName.length > 50) { setError("Community name must be at most 50 characters."); return; }
    setError(""); setSubmitting(true);
    try {
      const { data } = await api.post("/api/communities", {
        name: trimmedName,
        description: description.trim() || null,
        is_private: isPrivate,
      });
      navigate(`/communities/${data.id}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map(d => d.msg).join(", ") : detail || "Failed to create community");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = name.trim().length >= 3 && !submitting;

  const input = {
    width: "100%", padding: "9px 12px",
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: 4, fontSize: 14, fontFamily: "inherit",
    outline: "none", background: theme.input, color: theme.text,
    boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: isMobile ? "16px 12px 80px" : "24px 20px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 16 }}>Create a Community</div>

      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4, padding: "20px 20px" }}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: "rgba(255,88,91,0.1)", border: `1px solid ${theme.danger}`, borderRadius: 4, padding: "8px 12px", color: theme.danger, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Community Name *
            </label>
            <input
              style={input}
              type="text"
              placeholder="e.g. Physics Club"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 50))}
              autoFocus
              onFocus={e => e.currentTarget.style.borderColor = theme.accent}
              onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
            />
            <div style={{ fontSize: 11, color: theme.textSub, textAlign: "right", marginTop: 2 }}>{name.length}/50</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Description (optional)
            </label>
            <textarea
              style={{ ...input, resize: "vertical", minHeight: 90 }}
              placeholder="What is this community about?"
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 300))}
              onFocus={e => e.currentTarget.style.borderColor = theme.accent}
              onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
            />
            <div style={{ fontSize: 11, color: theme.textSub, textAlign: "right", marginTop: 2 }}>{description.length}/300</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Privacy
            </label>
            <div style={{ display: "flex", borderRadius: 20, overflow: "hidden", border: `1.5px solid ${theme.accent}`, width: "fit-content" }}>
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                style={{
                  padding: "7px 20px", border: "none", cursor: "pointer", fontWeight: 700,
                  fontSize: 13, fontFamily: "inherit",
                  background: !isPrivate ? theme.accent : "none",
                  color: !isPrivate ? "#fff" : theme.accent,
                }}
              >
                🌐 Public
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                style={{
                  padding: "7px 20px", border: "none", cursor: "pointer", fontWeight: 700,
                  fontSize: 13, fontFamily: "inherit",
                  background: isPrivate ? theme.accent : "none",
                  color: isPrivate ? "#fff" : theme.accent,
                }}
              >
                🔒 Private
              </button>
            </div>
            <div style={{ fontSize: 12, color: theme.textSub, marginTop: 6 }}>
              {isPrivate ? "Private: only approved members can see posts and join." : "Public: anyone can join and see posts."}
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: "100%", padding: "10px 0",
              background: canSubmit ? theme.accent : theme.border,
              color: canSubmit ? "#fff" : theme.textSub,
              border: "none", borderRadius: 20, fontSize: 14, fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit",
            }}
          >
            {submitting ? "Creating…" : "Create Community"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/communities")}
            style={{ width: "100%", padding: "8px 0", background: "none", color: theme.textSub, border: "none", fontSize: 13, cursor: "pointer", marginTop: 8, fontFamily: "inherit" }}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
