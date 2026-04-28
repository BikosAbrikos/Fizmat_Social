import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function UserProfile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [friendStatus, setFriendStatus] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(true);

  useEffect(() => {
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
    if (!window.confirm("Block this user? Their posts will be hidden and they can't send you friend requests.")) return;
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

  if (!profile) return <div style={{ textAlign: "center", color: theme.textSub, padding: "60px 0" }}>Loading…</div>;

  const initials = profile.name.charAt(0).toUpperCase();
  const isMe = me?.id === profile.id;

  const btn = (label, onClick, variant = "primary") => (
    <button
      onClick={onClick}
      style={{
        width: "100%", padding: "8px 0", borderRadius: 20, border: "none",
        fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
        marginTop: 10,
        ...(variant === "primary" ? { background: theme.accent, color: "#fff" } :
          variant === "outline" ? { background: "none", color: theme.accent, border: `1px solid ${theme.accent}` } :
          variant === "muted" ? { background: theme.cardHover, color: theme.textSub, cursor: "default" } :
          variant === "danger" ? { background: "none", color: theme.danger, border: `1px solid ${theme.danger}` } :
          { background: theme.cardHover, color: theme.textSub }),
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 12px 80px" }}>
      {/* Profile card */}
      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
        {/* Banner */}
        <div style={{ height: 80, background: `linear-gradient(135deg, ${theme.accent}, #ff6534)` }} />
        <div style={{ padding: "0 20px 20px" }}>
          {/* Avatar */}
          <div style={{ marginTop: -36, marginBottom: 10 }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `3px solid ${theme.card}` }} />
              : <div style={{ width: 72, height: 72, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 28, border: `3px solid ${theme.card}` }}>{initials}</div>
            }
          </div>

          <div style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 2 }}>{profile.name}</div>
          {profile.username && <div style={{ fontSize: 14, color: theme.textSub, marginBottom: 8 }}>u/{profile.username}</div>}
          {profile.bio && <p style={{ fontSize: 14, color: theme.text, lineHeight: 1.5, marginBottom: 8, fontStyle: "italic" }}>"{profile.bio}"</p>}

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: theme.textSub, marginBottom: 8 }}>
            {profile.grade && <span>📚 Grade {profile.grade}</span>}
            {profile.age && <span>🎂 Age {profile.age}</span>}
            {profile.future_major && <span>🎯 {profile.future_major}</span>}
          </div>

          {isMe && btn("Edit my profile", () => navigate("/profile"), "outline")}

          {!isMe && (
            <>
              {isBlocked ? (
                btn("Unblock user", handleUnblock, "danger")
              ) : (
                <>
                  {friendStatus?.status === "none" && btn("Add Friend", sendRequest, "primary")}
                  {friendStatus?.status === "pending_sent" && btn("Request Sent", null, "muted")}
                  {friendStatus?.status === "friends" && btn("Friends ✓", null, "muted")}
                  {friendStatus?.status === "pending_received" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={handleAccept} style={{ flex: 1, padding: "8px 0", background: theme.accent, color: "#fff", border: "none", borderRadius: 20, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Accept</button>
                      <button onClick={handleReject} style={{ flex: 1, padding: "8px 0", background: theme.cardHover, color: theme.text, border: "none", borderRadius: 20, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Reject</button>
                    </div>
                  )}
                  <button
                    onClick={handleBlock}
                    style={{ width: "100%", marginTop: 8, padding: "6px 0", background: "none", color: theme.danger, border: `1px solid ${theme.border}`, borderRadius: 20, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Block user
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Friends */}
      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.border}` }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Friends {!friendsLoading && `(${friends.length})`}
          </span>
        </div>
        <div style={{ padding: "12px 16px" }}>
          {friendsLoading ? (
            <div style={{ fontSize: 13, color: theme.textSub }}>Loading…</div>
          ) : friends.length === 0 ? (
            <div style={{ fontSize: 13, color: theme.textSub }}>No friends yet.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {friends.map(f => (
                <div
                  key={f.id}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", width: 60 }}
                  onClick={() => navigate(`/users/${f.id}`)}
                >
                  {f.avatar_url
                    ? <img src={f.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
                    : <div style={{ width: 44, height: 44, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>{f.name.charAt(0).toUpperCase()}</div>
                  }
                  <span style={{ fontSize: 11, color: theme.text, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: 60 }}>{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Posts */}
      <div style={{ fontSize: 11, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
        Posts {!postsLoading && `(${posts.length})`}
      </div>
      {postsLoading ? (
        <div style={{ fontSize: 13, color: theme.textSub }}>Loading…</div>
      ) : posts.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4, padding: 24, textAlign: "center", fontSize: 14, color: theme.textSub }}>
          No posts yet.
        </div>
      ) : (
        posts.map(post => (
          <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} onDelete={handlePostDelete} />
        ))
      )}
    </div>
  );
}
