import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

const s = {
  page: { maxWidth: 500, margin: "0 auto", padding: "32px 16px" },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 24 },
  empty: { color: "#65676b", fontSize: 15, textAlign: "center", marginTop: 40 },
  card: { background: "#fff", borderRadius: 8, padding: 16, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 14 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: "50%", background: "#1877f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, flexShrink: 0 },
  avatar: { width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  info: { flex: 1 },
  name: { fontWeight: 600, fontSize: 15, cursor: "pointer" },
  sub: { fontSize: 13, color: "#65676b", marginTop: 2 },
  actions: { display: "flex", gap: 8 },
  acceptBtn: { padding: "6px 14px", background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  rejectBtn: { padding: "6px 14px", background: "#e4e6eb", color: "#1c1e21", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  done: { fontSize: 13, color: "#65676b", fontStyle: "italic" },
};

export default function Notifications() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/friends/requests/incoming")
      .then(({ data }) => setRequests(data))
      .finally(() => setLoading(false));
  }, []);

  const handle = async (requestId, action) => {
    await api.post(`/api/friends/requests/${requestId}/${action}`);
    setRequests(prev =>
      prev.map(r => r.id === requestId ? { ...r, status: action === "accept" ? "accepted" : "rejected" } : r)
    );
  };

  return (
    <div style={s.page}>
      <h1 style={s.title}>Notifications</h1>
      {loading && <p style={s.empty}>Loading...</p>}
      {!loading && requests.length === 0 && <p style={s.empty}>No new notifications</p>}
      {requests.map(req => {
        const initials = req.sender.name.charAt(0).toUpperCase();
        const isPending = req.status === "pending";
        return (
          <div key={req.id} style={s.card}>
            {req.sender.avatar_url
              ? <img src={req.sender.avatar_url} alt="" style={s.avatar} />
              : <div style={s.avatarPlaceholder}>{initials}</div>
            }
            <div style={s.info}>
              <div style={s.name} onClick={() => navigate(`/users/${req.sender.id}`)}>
                {req.sender.name}
              </div>
              <div style={s.sub}>wants to be your friend</div>
            </div>
            <div style={s.actions}>
              {isPending ? (
                <>
                  <button style={s.acceptBtn} onClick={() => handle(req.id, "accept")}>Accept</button>
                  <button style={s.rejectBtn} onClick={() => handle(req.id, "reject")}>Reject</button>
                </>
              ) : (
                <span style={s.done}>{req.status === "accepted" ? "Accepted" : "Rejected"}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
