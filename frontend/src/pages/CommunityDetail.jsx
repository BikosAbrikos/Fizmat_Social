import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { maxWidth: 800, margin: "0 auto", padding: "24px 16px" },

  // Banner
  banner: {
    background: "#fff", borderRadius: 8, padding: "24px 20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: 20,
    display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap",
  },
  avatarWrap: { position: "relative", cursor: "pointer", flexShrink: 0 },
  avatar: {
    width: 80, height: 80, borderRadius: "50%", objectFit: "cover",
    background: "#1877f2", color: "#fff", display: "flex",
    alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 30,
  },
  avatarOverlay: {
    position: "absolute", inset: 0, borderRadius: "50%",
    background: "rgba(0,0,0,0.45)", display: "flex",
    alignItems: "center", justifyContent: "center",
  },
  bannerInfo: { flex: 1, minWidth: 0 },
  bannerName: { fontSize: 22, fontWeight: 700, color: "#1c1e21", marginBottom: 4 },
  bannerDesc: { fontSize: 14, color: "#65676b", marginBottom: 8, lineHeight: 1.5 },
  bannerMeta: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  memberCount: { fontSize: 13, color: "#65676b" },
  privateBadge: {
    fontSize: 12, fontWeight: 700, background: "#f0f2f5", color: "#65676b",
    borderRadius: 10, padding: "2px 8px",
  },
  actionBtn: {
    padding: "8px 20px", borderRadius: 20, fontWeight: 700, fontSize: 14,
    cursor: "pointer", border: "none", marginTop: 12,
  },

  // Tabs
  tabBar: {
    display: "flex", background: "#fff", borderRadius: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: 20, overflow: "hidden",
  },
  tab: (active) => ({
    flex: 1, padding: "12px 0", textAlign: "center", fontSize: 14,
    fontWeight: active ? 700 : 500,
    color: active ? "#1877f2" : "#65676b",
    borderBottom: active ? "2px solid #1877f2" : "2px solid transparent",
    cursor: "pointer", background: "none", border: "none",
    borderBottom: active ? "3px solid #1877f2" : "3px solid transparent",
    fontFamily: "inherit",
  }),

  // Posts tab
  createPostBtn: {
    display: "block", width: "100%", padding: "12px 16px",
    background: "#fff", border: "1px solid #ccd0d5", borderRadius: 8,
    fontSize: 15, color: "#65676b", textAlign: "left",
    cursor: "pointer", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    fontFamily: "inherit",
  },
  privateNotice: {
    textAlign: "center", color: "#65676b", padding: "40px 20px",
    background: "#fff", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    fontSize: 15,
  },
  empty: { textAlign: "center", color: "#65676b", marginTop: 20, fontSize: 15 },

  // Members
  memberRow: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
    background: "#fff", borderRadius: 8, marginBottom: 8,
    boxShadow: "0 1px 2px rgba(0,0,0,0.07)",
  },
  memberAvatar: {
    width: 40, height: 40, borderRadius: "50%", objectFit: "cover",
    background: "#1877f2", color: "#fff", display: "flex",
    alignItems: "center", justifyContent: "center", fontWeight: 700,
    fontSize: 16, flexShrink: 0,
  },
  memberName: { fontWeight: 600, fontSize: 14, color: "#1c1e21" },
  memberUsername: { fontSize: 12, color: "#65676b" },
  roleBadge: (role) => ({
    fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "2px 8px",
    background: role === "owner" ? "#fff3cd" : role === "moderator" ? "#d4edda" : "#f0f2f5",
    color: role === "owner" ? "#856404" : role === "moderator" ? "#155724" : "#65676b",
    marginLeft: 4,
  }),
  kickBtn: {
    marginLeft: "auto", background: "none", border: "none",
    color: "#e41749", cursor: "pointer", fontSize: 12, fontWeight: 600,
    padding: "4px 8px",
  },

  // Requests
  requestRow: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
    background: "#fff", borderRadius: 8, marginBottom: 8,
    boxShadow: "0 1px 2px rgba(0,0,0,0.07)", flexWrap: "wrap",
  },
  requestActions: { display: "flex", gap: 8, marginLeft: "auto" },
  acceptBtn: {
    padding: "6px 14px", background: "#42b72a", color: "#fff",
    border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer",
  },
  denyBtn: {
    padding: "6px 14px", background: "#f0f2f5", color: "#65676b",
    border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer",
  },

  uploadErr: { color: "#e41749", fontSize: 12, marginTop: 4, textAlign: "center" },
};

function getInitials(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CommunityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("Posts");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [hoveringAvatar, setHoveringAvatar] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchCommunity = async () => {
    try {
      const { data } = await api.get(`/api/communities/${id}`);
      setCommunity(data);
    } catch {
      navigate("/communities");
    }
  };

  const fetchPosts = async () => {
    try {
      const { data } = await api.get(`/api/communities/${id}/posts`);
      setPosts(data);
    } catch {
      setPosts([]);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data } = await api.get(`/api/communities/${id}/members`);
      setMembers(data);
    } catch {
      setMembers([]);
    }
  };

  const fetchRequests = async () => {
    try {
      const { data } = await api.get(`/api/communities/${id}/requests`);
      setRequests(data);
    } catch {
      setRequests([]);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchCommunity();
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!community) return;
    if (activeTab === "Posts") fetchPosts();
    if (activeTab === "Members") fetchMembers();
    if (activeTab === "Requests") fetchRequests();
  }, [activeTab, community?.id]);

  // Initial data load for Posts tab
  useEffect(() => {
    if (community) fetchPosts();
  }, [community?.id]);

  const myRole = community?.my_role;
  const isMember = myRole === "owner" || myRole === "moderator" || myRole === "member";
  const isOwnerOrMod = myRole === "owner" || myRole === "moderator";

  // ── Action button ──────────────────────────────────────────────────────────

  const handleJoin = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await api.post(`/api/communities/${id}/join`);
      await fetchCommunity();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to join");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this community?")) return;
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await api.delete(`/api/communities/${id}/leave`);
      await fetchCommunity();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to leave");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Avatar upload ──────────────────────────────────────────────────────────

  const handleAvatarClick = () => {
    if (myRole !== "owner") return;
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadError("");

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only JPEG, PNG, or WebP images allowed.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Image must be under 8 MB.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data: uploaded } = await api.post("/api/media/upload-community-avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await api.put(`/api/communities/${id}`, { avatar_url: uploaded.url });
      await fetchCommunity();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setUploadError(detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // ── Kick member ────────────────────────────────────────────────────────────

  const handleKick = async (userId) => {
    if (!window.confirm("Kick this member?")) return;
    try {
      await api.delete(`/api/communities/${id}/members/${userId}`);
      await fetchMembers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to kick member");
    }
  };

  // ── Request actions ────────────────────────────────────────────────────────

  const handleAccept = async (reqId) => {
    try {
      await api.post(`/api/communities/${id}/requests/${reqId}/accept`);
      await fetchRequests();
      await fetchCommunity();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to accept");
    }
  };

  const handleReject = async (reqId) => {
    try {
      await api.post(`/api/communities/${id}/requests/${reqId}/reject`);
      await fetchRequests();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reject");
    }
  };

  // ── Post updates ───────────────────────────────────────────────────────────

  const handlePostUpdate = (updated) =>
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  const handlePostDelete = (postId) =>
    setPosts((prev) => prev.filter((p) => p.id !== postId));

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const tabs = ["Posts", "Members", ...(isOwnerOrMod ? ["Requests"] : [])];

  if (loading) {
    return (
      <div style={{ ...s.page, paddingBottom: isMobile ? 96 : 24 }}>
        <div style={{ textAlign: "center", color: "#65676b", marginTop: 40 }}>Loading...</div>
      </div>
    );
  }

  if (!community) return null;

  // ── Action button rendering ────────────────────────────────────────────────

  let actionBtnLabel = "";
  let actionBtnStyle = { ...s.actionBtn };
  let actionBtnClick = undefined;
  let actionBtnDisabled = actionLoading;

  if (myRole === "owner") {
    actionBtnLabel = "You're the owner";
    actionBtnStyle = { ...s.actionBtn, background: "#f0f2f5", color: "#65676b", cursor: "default" };
    actionBtnDisabled = true;
  } else if (myRole === "pending") {
    actionBtnLabel = "Pending approval...";
    actionBtnStyle = { ...s.actionBtn, background: "#f0f2f5", color: "#65676b", cursor: "default" };
    actionBtnDisabled = true;
  } else if (isMember) {
    actionBtnLabel = actionLoading ? "Leaving..." : "Leave Community";
    actionBtnStyle = { ...s.actionBtn, background: "#f0f2f5", color: "#e41749" };
    actionBtnClick = handleLeave;
  } else if (community.is_private) {
    actionBtnLabel = actionLoading ? "Requesting..." : "Request to Join";
    actionBtnStyle = { ...s.actionBtn, background: "#fff", color: "#1877f2", border: "1.5px solid #1877f2" };
    actionBtnClick = handleJoin;
  } else {
    actionBtnLabel = actionLoading ? "Joining..." : "Join Community";
    actionBtnStyle = { ...s.actionBtn, background: "#1877f2", color: "#fff" };
    actionBtnClick = handleJoin;
  }

  const showAvatarOverlay = (hoveringAvatar || uploading) && myRole === "owner";

  return (
    <div style={{ ...s.page, paddingBottom: isMobile ? 96 : 24 }}>

      {/* Banner */}
      <div style={s.banner}>
        <div
          style={s.avatarWrap}
          onClick={handleAvatarClick}
          onMouseEnter={() => setHoveringAvatar(true)}
          onMouseLeave={() => setHoveringAvatar(false)}
          title={myRole === "owner" ? "Click to change community avatar" : undefined}
        >
          {community.avatar_url
            ? <img src={community.avatar_url} alt="" style={{ ...s.avatar, display: "block" }} />
            : <div style={s.avatar}>{getInitials(community.name)}</div>
          }
          {showAvatarOverlay && (
            <div style={s.avatarOverlay}>
              {uploading
                ? <div style={{ width: 24, height: 24, border: "3px solid #fff", borderTop: "3px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              }
            </div>
          )}
          {myRole === "owner" && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          )}
        </div>

        <div style={s.bannerInfo}>
          <div style={s.bannerName}>{community.name}</div>
          {community.description && (
            <div style={s.bannerDesc}>{community.description}</div>
          )}
          <div style={s.bannerMeta}>
            <span style={s.memberCount}>
              👥 {community.member_count} {community.member_count === 1 ? "member" : "members"}
            </span>
            {community.is_private && <span style={s.privateBadge}>🔒 Private</span>}
          </div>
          {uploadError && <div style={s.uploadErr}>{uploadError}</div>}
          <button
            style={actionBtnStyle}
            onClick={actionBtnClick}
            disabled={actionBtnDisabled}
          >
            {actionBtnLabel}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab}
            style={s.tab(activeTab === tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === "Requests" && requests.length > 0 && (
              <span style={{ marginLeft: 4, background: "#e41749", color: "#fff", borderRadius: "50%", fontSize: 10, fontWeight: 700, padding: "1px 5px" }}>
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}

      {/* ── Posts ─────────────────────────────────────────────────────────── */}
      {activeTab === "Posts" && (
        <div>
          {community.is_private && !isMember ? (
            <div style={s.privateNotice}>
              🔒 This is a private community. Join to see posts.
            </div>
          ) : (
            <>
              {isMember && (
                <button
                  style={s.createPostBtn}
                  onClick={() => navigate(`/submit?communityId=${id}`)}
                >
                  ✏️ Create Post in {community.name}
                </button>
              )}
              {posts.length === 0 ? (
                <div style={s.empty}>No posts yet.</div>
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onUpdate={handlePostUpdate}
                    onDelete={handlePostDelete}
                  />
                ))
              )}
            </>
          )}
        </div>
      )}

      {/* ── Members ───────────────────────────────────────────────────────── */}
      {activeTab === "Members" && (
        <div>
          {members.length === 0 ? (
            <div style={s.empty}>No members yet.</div>
          ) : (
            members.map((m) => {
              const initials = getInitials(m.user.name);
              const canKick =
                isOwnerOrMod &&
                m.user.id !== user?.id &&
                m.user.id !== community.owner_id;

              const roleIcon = m.role === "owner" ? "🌟" : m.role === "moderator" ? "⭐" : "";

              return (
                <div key={m.id} style={s.memberRow}>
                  {m.user.avatar_url
                    ? <img src={m.user.avatar_url} alt="" style={{ ...s.memberAvatar, display: "block" }} />
                    : <div style={s.memberAvatar}>{initials}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.memberName}>
                      {roleIcon} {m.user.name}
                      <span style={s.roleBadge(m.role)}>{m.role}</span>
                    </div>
                    {m.user.username && (
                      <div style={s.memberUsername}>@{m.user.username}</div>
                    )}
                  </div>
                  {canKick && (
                    <button style={s.kickBtn} onClick={() => handleKick(m.user.id)}>
                      Kick
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Requests ──────────────────────────────────────────────────────── */}
      {activeTab === "Requests" && isOwnerOrMod && (
        <div>
          {requests.length === 0 ? (
            <div style={s.empty}>No pending join requests.</div>
          ) : (
            requests.map((req) => {
              const initials = getInitials(req.user.name);
              return (
                <div key={req.id} style={s.requestRow}>
                  {req.user.avatar_url
                    ? <img src={req.user.avatar_url} alt="" style={{ ...s.memberAvatar, display: "block" }} />
                    : <div style={s.memberAvatar}>{initials}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.memberName}>{req.user.name}</div>
                    {req.user.username && (
                      <div style={s.memberUsername}>@{req.user.username}</div>
                    )}
                    <div style={{ fontSize: 11, color: "#65676b", marginTop: 2 }}>
                      {new Date(req.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={s.requestActions}>
                    <button style={s.acceptBtn} onClick={() => handleAccept(req.id)}>
                      Accept
                    </button>
                    <button style={s.denyBtn} onClick={() => handleReject(req.id)}>
                      Deny
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
