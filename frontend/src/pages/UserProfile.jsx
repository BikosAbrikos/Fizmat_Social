import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";

const s = {
  page: { maxWidth: 600, margin: "0 auto", padding: "32px 16px" },
  card: { background: "#fff", borderRadius: 8, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: 16 },
  avatarWrap: { display: "flex", justifyContent: "center", marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: "50%", objectFit: "cover" },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: "50%", background: "#1877f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 32 },
  name: { fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 4 },
  username: { fontSize: 14, color: "#65676b", textAlign: "center", marginBottom: 16 },
  bio: { fontSize: 14, color: "#1c1e21", lineHeight: 1.6, fontStyle: "italic", textAlign: "center", margin: "12px 0" },
  divider: { borderTop: "1px solid #e4e6eb", margin: "14px 0" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  rowLabel: { fontSize: 13, fontWeight: 600, color: "#65676b", minWidth: 110 },
  rowValue: { fontSize: 14, color: "#1c1e21", textAlign: "right", flex: 1 },

  editBtn: { display: "block", width: "100%", padding: 10, background: "#e7f3ff", color: "#1877f2", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 },
  friendBtn: { display: "block", width: "100%", padding: 10, background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 12 },
  pendingBtn: { display: "block", width: "100%", padding: 10, background: "#e4e6eb", color: "#65676b", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, marginTop: 12, textAlign: "center" },
  friendsLabel: { display: "block", width: "100%", padding: 10, background: "#e7f3ff", color: "#1877f2", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, textAlign: "center", marginTop: 12 },
  acceptRow: { display: "flex", gap: 8, marginTop: 12 },
  acceptBtn: { flex: 1, padding: 10, background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  rejectBtn: { flex: 1, padding: 10, background: "#e4e6eb", color: "#1c1e21", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  blockBtn: { display: "block", width: "100%", padding: "8px 10px", background: "none", color: "#e41749", border: "1px solid #e41749", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 8 },
  unblockBtn: { display: "block", width: "100%", padding: "8px 10px", background: "#fff0f3", color: "#e41749", border: "1px solid #e41749", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 8 },

  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#1c1e21", marginBottom: 12 },
  emptyNote: { color: "#65676b", fontSize: 14, textAlign: "center", padding: "16px 0" },

  friendsGrid: { display: "flex", flexWrap: "wrap", gap: 12 },
  friendChip: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", width: 64 },
  friendAvatar: { width: 48, height: 48, borderRadius: "50%", objectFit: "cover" },
  friendAvatarPlaceholder: { width: 48, height: 48, borderRadius: "50%", background: "#1877f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18 },
  friendName: { fontSize: 11, color: "#1c1e21", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: 64 },

  loading: { textAlign: "center", color: "#65676b", padding: "60px 0" },
};

export default function UserProfile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [friendStatus, setFriendStatus] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(true);

  useEffect(() => {
    const userId = parseInt(id);
    Promise.all([
      api.get(`/api/users/${id}`),
      api.get(`/api/friends/status/${id}`).catch(() => ({ data: { status: "none" } })),
      api.get(`/api/blocks/status/${id}`).catch(() => ({ data: { is_blocked: false } })),
    ])
      .then(([profileRes, statusRes, blockRes]) => {
        setProfile(profileRes.data);
        setFriendStatus(statusRes.data);
        setIsBlocked(blockRes.data.is_blocked);
      })
      .catch(() => navigate("/", { replace: true }));

    api.get(`/api/users/${id}/posts`).then(({ data }) => setPosts(data)).catch(() => setPosts([])).finally(() => setPostsLoading(false));
    api.get(`/api/users/${id}/friends`).then(({ data }) => setFriends(data)).catch(() => setFriends([])).finally(() => setFriendsLoading(false));
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

  const handleBlock = async () => {
    if (!window.confirm("Block this user? They won't be able to send you friend requests and their posts will be hidden.")) return;
    await api.post(`/api/blocks/${id}`);
    setIsBlocked(true);
    setFriendStatus({ status: "none" });
  };

  const handleUnblock = async () => {
    await api.delete(`/api/blocks/${id}`);
    setIsBlocked(false);
    setFriendStatus({ status: "none" });
  };

  const handlePostUpdate = (updated) => setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
  const handlePostDelete = (postId) => setPosts(prev => prev.filter(p => p.id !== postId));

  if (!profile) return <div style={s.loading}>Loading...</div>;

  const initials = profile.name.charAt(0).toUpperCase();
  const isMe = me?.id === profile.id;

  return (
    <div style={s.page}>
      {/* ── Profile card ── */}
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

        {!isMe && (
          <>
            {isBlocked ? (
              <button style={s.unblockBtn} onClick={handleUnblock}>Unblock user</button>
            ) : (
              <>
                {friendStatus?.status === "none" && (
                  <button style={s.friendBtn} onClick={sendRequest}>Add Friend</button>
                )}
                {friendStatus?.status === "pending_sent" && (
                  <div style={s.pendingBtn}>Request Sent</div>
                )}
                {friendStatus?.status === "friends" && (
                  <div style={s.friendsLabel}>Friends</div>
                )}
                {friendStatus?.status === "pending_received" && (
                  <div style={s.acceptRow}>
                    <button style={s.acceptBtn} onClick={handleAccept}>Accept Request</button>
                    <button style={s.rejectBtn} onClick={handleReject}>Reject</button>
                  </div>
                )}
                <button style={s.blockBtn} onClick={handleBlock}>Block user</button>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Friends ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>
          Friends {!friendsLoading && `(${friends.length})`}
        </div>
        {friendsLoading ? (
          <div style={s.emptyNote}>Loading...</div>
        ) : friends.length === 0 ? (
          <div style={s.emptyNote}>No friends yet.</div>
        ) : (
          <div style={s.friendsGrid}>
            {friends.map(f => {
              const fi = f.name.charAt(0).toUpperCase();
              return (
                <div key={f.id} style={s.friendChip} onClick={() => navigate(`/users/${f.id}`)}>
                  {f.avatar_url
                    ? <img src={f.avatar_url} alt="" style={s.friendAvatar} />
                    : <div style={s.friendAvatarPlaceholder}>{fi}</div>
                  }
                  <span style={s.friendName}>{f.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Posts ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ ...s.sectionTitle, marginBottom: 12 }}>
          Posts {!postsLoading && `(${posts.length})`}
        </div>
        {postsLoading ? (
          <div style={s.emptyNote}>Loading...</div>
        ) : posts.length === 0 ? (
          <div style={{ ...s.emptyNote, background: "#fff", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: 24 }}>
            No posts yet.
          </div>
        ) : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onUpdate={handlePostUpdate}
              onDelete={handlePostDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
