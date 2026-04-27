import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useIsMobile } from "../hooks/useIsMobile";

const s = {
  page: { maxWidth: 900, margin: "0 auto", padding: "24px 16px" },
  topRow: {
    display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
    flexWrap: "wrap",
  },
  searchInput: {
    flex: 1, minWidth: 180, padding: "10px 14px", border: "1px solid #ccd0d5",
    borderRadius: 20, fontSize: 14, fontFamily: "inherit", outline: "none",
    boxSizing: "border-box",
  },
  createBtn: {
    padding: "10px 20px", background: "#1877f2", color: "#fff", border: "none",
    borderRadius: 20, fontWeight: 700, fontSize: 14, cursor: "pointer",
    whiteSpace: "nowrap",
  },
  grid: { display: "grid", gap: 16 },
  card: {
    background: "#fff", borderRadius: 8, padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)", cursor: "pointer",
    display: "flex", flexDirection: "column", gap: 10,
    transition: "box-shadow 0.15s",
    position: "relative",
  },
  cardTop: { display: "flex", alignItems: "center", gap: 12 },
  avatarCircle: {
    width: 72, height: 72, borderRadius: "50%", background: "#1877f2",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 26, flexShrink: 0, objectFit: "cover",
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { fontWeight: 700, fontSize: 16, color: "#1c1e21", marginBottom: 2 },
  cardDesc: {
    fontSize: 13, color: "#65676b", lineHeight: 1.4, marginBottom: 6,
    overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  cardMeta: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  memberCount: { fontSize: 12, color: "#65676b" },
  privateBadge: {
    fontSize: 11, fontWeight: 700, background: "#f0f2f5", color: "#65676b",
    borderRadius: 10, padding: "2px 8px",
  },
  joinBtn: {
    marginTop: 8, padding: "7px 16px", borderRadius: 20, fontWeight: 700,
    fontSize: 13, cursor: "pointer", border: "none", alignSelf: "flex-start",
  },
  empty: { textAlign: "center", color: "#65676b", marginTop: 40, fontSize: 15 },
  loading: { textAlign: "center", color: "#65676b", marginTop: 40 },
};

function getInitials(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

function CommunityCard({ community, onAction }) {
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
      const detail = err.response?.data?.detail;
      alert(detail || "Failed to join");
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
      const detail = err.response?.data?.detail;
      alert(detail || "Failed to leave");
    } finally {
      setLoading(false);
    }
  };

  const isMember = my_role === "member" || my_role === "moderator" || my_role === "owner";

  let btnLabel = "Join";
  let btnStyle = { ...s.joinBtn, background: "#1877f2", color: "#fff" };
  let btnAction = handleJoin;

  if (my_role === "owner") {
    btnLabel = "Owner";
    btnStyle = { ...s.joinBtn, background: "#f0f2f5", color: "#65676b", cursor: "default" };
    btnAction = (e) => { e.stopPropagation(); };
  } else if (my_role === "pending") {
    btnLabel = "Pending...";
    btnStyle = { ...s.joinBtn, background: "#f0f2f5", color: "#65676b", cursor: "default" };
    btnAction = (e) => { e.stopPropagation(); };
  } else if (isMember) {
    btnLabel = "Joined ✓";
    btnStyle = { ...s.joinBtn, background: "#e7f3ff", color: "#1877f2" };
    btnAction = handleLeave;
  } else if (is_private) {
    btnLabel = "Request to Join";
    btnStyle = { ...s.joinBtn, background: "#fff", color: "#1877f2", border: "1.5px solid #1877f2" };
    btnAction = handleJoin;
  }

  const truncDesc = description && description.length > 80
    ? description.slice(0, 80) + "..."
    : description;

  return (
    <div style={s.card} onClick={() => navigate(`/communities/${id}`)}>
      <div style={s.cardTop}>
        {avatar_url
          ? <img src={avatar_url} alt="" style={s.avatarCircle} />
          : <div style={s.avatarCircle}>{getInitials(name)}</div>
        }
        <div style={s.cardBody}>
          <div style={s.cardName}>{name}</div>
          {truncDesc && <div style={s.cardDesc}>{truncDesc}</div>}
          <div style={s.cardMeta}>
            <span style={s.memberCount}>👥 {member_count} {member_count === 1 ? "member" : "members"}</span>
            {is_private && <span style={s.privateBadge}>🔒 Private</span>}
          </div>
        </div>
      </div>
      <button style={btnStyle} onClick={btnAction} disabled={loading}>
        {loading ? "..." : btnLabel}
      </button>
    </div>
  );
}

export default function Communities() {
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

  useEffect(() => {
    fetchCommunities();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchCommunities(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const gridCols = isMobile ? "1fr" : "1fr 1fr";

  return (
    <div style={{ ...s.page, paddingBottom: isMobile ? 96 : 24 }}>
      <div style={s.topRow}>
        <input
          style={s.searchInput}
          placeholder="Search communities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button style={s.createBtn} onClick={() => navigate("/communities/create")}>
          + Create Community
        </button>
      </div>

      {loading ? (
        <div style={s.loading}>Loading...</div>
      ) : communities.length === 0 ? (
        <div style={s.empty}>
          {search ? "No communities match your search." : "No communities yet. Create one!"}
        </div>
      ) : (
        <div style={{ ...s.grid, gridTemplateColumns: gridCols }}>
          {communities.map((c) => (
            <CommunityCard key={c.id} community={c} onAction={() => fetchCommunities(search)} />
          ))}
        </div>
      )}
    </div>
  );
}
