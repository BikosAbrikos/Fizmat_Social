import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const s = {
  page: { maxWidth: 500, margin: "0 auto", padding: "32px 16px" },
  card: { background: "#fff", borderRadius: 8, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  avatarWrap: { display: "flex", justifyContent: "center", marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: "50%", objectFit: "cover" },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: "50%", background: "#1877f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 32 },
  name: { fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 4 },
  username: { fontSize: 14, color: "#65676b", textAlign: "center", marginBottom: 20 },
  divider: { borderTop: "1px solid #e4e6eb", margin: "16px 0" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  rowLabel: { fontSize: 13, fontWeight: 600, color: "#65676b", minWidth: 110 },
  rowValue: { fontSize: 14, color: "#1c1e21", textAlign: "right", flex: 1 },
  bio: { fontSize: 14, color: "#1c1e21", lineHeight: 1.6, fontStyle: "italic", textAlign: "center", margin: "16px 0" },
  editBtn: { display: "block", width: "100%", padding: 10, background: "#e7f3ff", color: "#1877f2", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 },
  friendBtn: { display: "block", width: "100%", padding: 10, background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 20 },
  pendingBtn: { display: "block", width: "100%", padding: 10, background: "#e4e6eb", color: "#65676b", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, marginTop: 20 },
  friendsLabel: { display: "block", width: "100%", padding: 10, background: "#e7f3ff", color: "#1877f2", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, textAlign: "center", marginTop: 20 },
  acceptRow: { display: "flex", gap: 8, marginTop: 20 },
  acceptBtn: { flex: 1, padding: 10, background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  rejectBtn: { flex: 1, padding: 10, background: "#e4e6eb", color: "#1c1e21", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  error: { color: "#e41749", textAlign: "center", fontSize: 14 },
};

export default function UserProfile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [friendStatus, setFriendStatus] = useState(null); // {status, request_id}
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/api/users/${id}`)
      .then(({ data }) => setProfile(data))
      .catch(() => setError("User not found"));
    api.get(`/api/friends/status/${id}`)
      .then(({ data }) => setFriendStatus(data));
  }, [id]);

  const sendRequest = async () => {
    await api.post(`/api/friends/request/${id}`);
    setFriendStatus({ status: "pending_sent" });
  };

  const handleAccept = async () => {
    await api.post(`/api/friends/requests/${friendStatus.request_id}/accept`);
    setFriendStatus({ status: "friends" });
  };

  const handleReject = async () => {
    await api.post(`/api/friends/requests/${friendStatus.request_id}/reject`);
    setFriendStatus({ status: "none" });
  };

  if (error) return <div style={s.page}><div style={s.card}><p style={s.error}>{error}</p></div></div>;
  if (!profile) return <div style={s.page}><div style={s.card}><p style={{ textAlign: "center", color: "#65676b" }}>Loading...</p></div></div>;

  const initials = profile.name.charAt(0).toUpperCase();
  const isMe = me?.id === profile.id;

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.avatarWrap}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" style={s.avatar} />
            : <div style={s.avatarPlaceholder}>{initials}</div>
          }
        </div>

        <div style={s.name}>{profile.name}</div>
        {profile.username && <div style={s.username}>@{profile.username}</div>}

        {profile.bio && <p style={s.bio}>"{profile.bio}"</p>}

        <div style={s.divider} />

        {profile.age && (
          <div style={s.row}>
            <span style={s.rowLabel}>Age</span>
            <span style={s.rowValue}>{profile.age}</span>
          </div>
        )}
        {profile.grade && (
          <div style={s.row}>
            <span style={s.rowLabel}>Grade</span>
            <span style={s.rowValue}>{profile.grade}</span>
          </div>
        )}
        {profile.future_major && (
          <div style={s.row}>
            <span style={s.rowLabel}>Future major</span>
            <span style={s.rowValue}>{profile.future_major}</span>
          </div>
        )}

        {isMe && (
          <button style={s.editBtn} onClick={() => navigate("/profile")}>
            Edit my profile
          </button>
        )}

        {!isMe && friendStatus && (
          <>
            {friendStatus.status === "none" && (
              <button style={s.friendBtn} onClick={sendRequest}>Add Friend</button>
            )}
            {friendStatus.status === "pending_sent" && (
              <div style={s.pendingBtn}>Request Sent</div>
            )}
            {friendStatus.status === "friends" && (
              <div style={s.friendsLabel}>Friends</div>
            )}
            {friendStatus.status === "pending_received" && (
              <div style={s.acceptRow}>
                <button style={s.acceptBtn} onClick={handleAccept}>Accept Request</button>
                <button style={s.rejectBtn} onClick={handleReject}>Reject</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
