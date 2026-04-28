import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";

function getInitials(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

function CommunityCard({ community, onAction, theme }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { my_role, is_private, name, description, member_count, avatar_url, id } = community;

  const handleJoin = async (e) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      await api.post(`/api/communities/${id}/join`);
      onAction();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Leave this community?")) return;
    if (loading) return;
    setLoading(true);
    try {
      await api.delete(`/api/communities/${id}/leave`);
      onAction();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to leave");
    } finally {
      setLoading(false);
    }
  };

  const isMember = my_role === "member" || my_role === "moderator" || my_role === "owner";
  let btnLabel = is_private ? "Request to Join" : "Join";
  let btnBg = theme.accent;
  let btnColor = "#fff";
  let btnBorder = "none";
  let btnAction = handleJoin;
  let btnDisabled = false;

  if (my_role === "owner") {
    btnLabel = "Owner";
    btnBg = theme.cardHover;
    btnColor = theme.textSub;
    btnAction = (e) => e.stopPropagation();
    btnDisabled = true;
  } else if (my_role === "pending") {
    btnLabel = "Pending…";
    btnBg = theme.cardHover;
    btnColor = theme.textSub;
    btnAction = (e) => e.stopPropagation();
    btnDisabled = true;
  } else if (isMember) {
    btnLabel = "Joined ✓";
    btnBg = "none";
    btnColor = theme.accent;
    btnBorder = `1px solid ${theme.accent}`;
    btnAction = handleLeave;
  }

  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 4,
        padding: 14,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.15s",
      }}
      onClick={() => navigate(`/communities/${id}`)}
      onMouseEnter={e => e.currentTarget.style.borderColor = theme.textSub}
      onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {avatar_url
          ? <img src={avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          : <div style={{ width: 48, height: 48, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, flexShrink: 0 }}>{getInitials(name)}</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: theme.text }}>c/{name}</div>
          {description && (
            <div style={{ fontSize: 12, color: theme.textSub, marginTop: 2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {description}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: 12, color: theme.textSub }}>
            <span>👥 {member_count} {member_count === 1 ? "member" : "members"}</span>
            {is_private && <span style={{ background: theme.cardHover, borderRadius: 10, padding: "1px 7px", fontWeight: 700, fontSize: 11 }}>🔒 Private</span>}
          </div>
        </div>
      </div>
      <button
        onClick={btnAction}
        disabled={loading || btnDisabled}
        style={{
          padding: "6px 0",
          background: btnBg,
          color: btnColor,
          border: btnBorder,
          borderRadius: 20,
          fontWeight: 700,
          fontSize: 13,
          cursor: (loading || btnDisabled) ? "default" : "pointer",
          fontFamily: "inherit",
          alignSelf: "flex-start",
          minWidth: 100,
        }}
      >
        {loading ? "…" : btnLabel}
      </button>
    </div>
  );
}

export default function Communities() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [communities, setCommunities] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCommunities = async (q = "") => {
    setLoading(true);
    try {
      const params = q.trim() ? { q: q.trim() } : {};
      const { data } = await api.get("/api/communities", { params });
      setCommunities(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCommunities(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchCommunities(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "14px 10px 80px" : "20px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          style={{
            flex: 1,
            minWidth: 180,
            padding: "9px 14px",
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: 20,
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            background: theme.input,
            color: theme.text,
            boxSizing: "border-box",
          }}
          placeholder="Search communities…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={e => e.currentTarget.style.borderColor = theme.accent}
          onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
        />
        <button
          onClick={() => navigate("/communities/create")}
          style={{
            padding: "9px 18px",
            background: theme.accent,
            color: "#fff",
            border: "none",
            borderRadius: 20,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          + Create Community
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: theme.textSub, padding: "40px 0" }}>Loading…</div>
      ) : communities.length === 0 ? (
        <div style={{ textAlign: "center", color: theme.textSub, padding: "40px 0", fontSize: 14 }}>
          {search ? "No communities match your search." : "No communities yet. Create one!"}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          {communities.map((c) => (
            <CommunityCard key={c.id} community={c} onAction={() => fetchCommunities(search)} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}
