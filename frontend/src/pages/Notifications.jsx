import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

const s = {
  page: { maxWidth: 520, margin: "0 auto", padding: "32px 16px" },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#65676b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginTop: 24 },
  empty: { color: "#65676b", fontSize: 14, textAlign: "center", padding: "20px 0" },
  card: { background: "#fff", borderRadius: 8, padding: 14, marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 12 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: "50%", background: "#1877f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, flexShrink: 0 },
  avatar: { width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { fontWeight: 600, fontSize: 14, cursor: "pointer" },
  sub: { fontSize: 13, color: "#65676b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  badge: { background: "#e41749", color: "#fff", borderRadius: 12, fontSize: 11, fontWeight: 700, padding: "2px 7px", flexShrink: 0 },
  actions: { display: "flex", gap: 8, flexShrink: 0 },
  acceptBtn: { padding: "6px 14px", background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  rejectBtn: { padding: "6px 14px", background: "#e4e6eb", color: "#1c1e21", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  replyBtn: { padding: "6px 14px", background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  done: { fontSize: 13, color: "#65676b", fontStyle: "italic" },
};

const Avatar = ({ user }) => user?.avatar_url
  ? <img src={user.avatar_url} alt="" style={s.avatar} />
  : <div style={s.avatarPlaceholder}>{user?.name?.charAt(0).toUpperCase()}</div>;

export default function Notifications() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [unreadChats, setUnreadChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/friends/requests/incoming"),
      api.get("/api/chats/unread"),
    ]).then(([reqRes, chatRes]) => {
      setRequests(reqRes.data);
      setUnreadChats(chatRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleFriendAction = async (requestId, action) => {
    await api.post(`/api/friends/requests/${requestId}/${action}`);
    setRequests(prev =>
      prev.map(r => r.id === requestId ? { ...r, status: action === "accept" ? "accepted" : "rejected" } : r)
    );
  };

  const fmtTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return <div style={s.page}><p style={{ color: "#65676b" }}>Loading...</p></div>;

  const hasAnything = requests.length > 0 || unreadChats.length > 0;

  return (
    <div style={s.page}>
      <h1 style={s.title}>Notifications</h1>

      {!hasAnything && <p style={s.empty}>No new notifications</p>}

      {/* ── Unread messages ── */}
      {unreadChats.length > 0 && (
        <>
          <div style={s.sectionTitle}>💬 New Messages</div>
          {unreadChats.map(item => (
            <div key={item.sender.id} style={s.card}>
              <Avatar user={item.sender} />
              <div style={s.info}>
                <div style={s.name} onClick={() => navigate(`/users/${item.sender.id}`)}>
                  {item.sender.name}
                </div>
                <div style={s.sub}>{item.last_message}</div>
                <div style={{ fontSize: 11, color: "#65676b", marginTop: 2 }}>{fmtTime(item.last_at)}</div>
              </div>
              {item.count > 1 && <div style={s.badge}>{item.count}</div>}
              <div style={s.actions}>
                <button style={s.replyBtn} onClick={() => navigate("/chats")}>Reply</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Friend requests ── */}
      {requests.length > 0 && (
        <>
          <div style={s.sectionTitle}>👤 Friend Requests</div>
          {requests.map(req => {
            const isPending = req.status === "pending";
            return (
              <div key={req.id} style={s.card}>
                <Avatar user={req.sender} />
                <div style={s.info}>
                  <div style={s.name} onClick={() => navigate(`/users/${req.sender.id}`)}>
                    {req.sender.name}
                  </div>
                  <div style={s.sub}>wants to be your friend</div>
                </div>
                <div style={s.actions}>
                  {isPending ? (
                    <>
                      <button style={s.acceptBtn} onClick={() => handleFriendAction(req.id, "accept")}>Accept</button>
                      <button style={s.rejectBtn} onClick={() => handleFriendAction(req.id, "reject")}>Reject</button>
                    </>
                  ) : (
                    <span style={s.done}>{req.status === "accepted" ? "Accepted ✓" : "Rejected"}</span>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
