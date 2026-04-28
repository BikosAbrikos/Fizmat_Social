import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useTheme } from "../context/ThemeContext";

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

function Avatar({ user, theme }) {
  if (user?.avatar_url) return <img src={user.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: 40, height: 40, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
      {user?.name?.charAt(0).toUpperCase()}
    </div>
  );
}

export default function Notifications() {
  const { theme } = useTheme();
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
    try {
      await api.post(`/api/friends/requests/${requestId}/${action}`);
      setRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, status: action === "accept" ? "accepted" : "rejected" } : r)
      );
    } catch (err) {
      alert(err.response?.data?.detail || "Action failed");
    }
  };

  if (loading) return <div style={{ textAlign: "center", color: theme.textSub, padding: "60px 0" }}>Loading…</div>;

  const hasAnything = requests.length > 0 || unreadChats.length > 0;

  const card = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 4,
    padding: "10px 14px",
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 12,
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "20px 14px 80px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 20 }}>Notifications</div>

      {!hasAnything && (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4, padding: 32, textAlign: "center", color: theme.textSub, fontSize: 14 }}>
          No new notifications
        </div>
      )}

      {/* Unread messages */}
      {unreadChats.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            New Messages
          </div>
          {unreadChats.map(item => (
            <div key={item.sender.id} style={card}>
              <Avatar user={item.sender} theme={theme} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ fontWeight: 700, fontSize: 14, color: theme.text, cursor: "pointer" }}
                  onClick={() => navigate(`/users/${item.sender.id}`)}
                >
                  u/{item.sender.username || item.sender.name}
                </div>
                <div style={{ fontSize: 13, color: theme.textSub, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.last_message}
                </div>
                <div style={{ fontSize: 11, color: theme.textSub, marginTop: 2 }}>{timeAgo(item.last_at)}</div>
              </div>
              {item.count > 1 && (
                <div style={{ background: theme.danger, color: "#fff", borderRadius: 12, fontSize: 11, fontWeight: 700, padding: "2px 7px", flexShrink: 0 }}>
                  {item.count}
                </div>
              )}
              <button
                onClick={() => navigate("/chats")}
                style={{ padding: "5px 14px", background: theme.accent, color: "#fff", border: "none", borderRadius: 20, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}
              >
                Reply
              </button>
            </div>
          ))}
        </>
      )}

      {/* Friend requests */}
      {requests.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: unreadChats.length > 0 ? 16 : 0 }}>
            Friend Requests
          </div>
          {requests.map(req => {
            const isPending = req.status === "pending";
            return (
              <div key={req.id} style={card}>
                <Avatar user={req.sender} theme={theme} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontWeight: 700, fontSize: 14, color: theme.text, cursor: "pointer" }}
                    onClick={() => navigate(`/users/${req.sender.id}`)}
                  >
                    u/{req.sender.username || req.sender.name}
                  </div>
                  <div style={{ fontSize: 12, color: theme.textSub, marginTop: 1 }}>wants to be your friend</div>
                </div>
                {isPending ? (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleFriendAction(req.id, "accept")}
                      style={{ padding: "5px 12px", background: theme.accent, color: "#fff", border: "none", borderRadius: 20, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleFriendAction(req.id, "reject")}
                      style={{ padding: "5px 12px", background: theme.cardHover, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 20, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: theme.textSub, fontStyle: "italic", flexShrink: 0 }}>
                    {req.status === "accepted" ? "Accepted ✓" : "Rejected"}
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
