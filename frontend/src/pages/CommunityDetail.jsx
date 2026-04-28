import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";

function getInitials(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

export default function CommunityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { theme } = useTheme();
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

  const [settingsName, setSettingsName] = useState("");
  const [settingsDesc, setSettingsDesc] = useState("");
  const [settingsPrivate, setSettingsPrivate] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  const fetchCommunity = async () => {
    try {
      const { data } = await api.get(`/api/communities/${id}`);
      setCommunity(data);
      setSettingsName(data.name);
      setSettingsDesc(data.description || "");
      setSettingsPrivate(data.is_private);
    } catch {
      navigate("/communities");
    }
  };

  const fetchPosts = async () => {
    try { const { data } = await api.get(`/api/communities/${id}/posts`); setPosts(data); }
    catch { setPosts([]); }
  };

  const fetchMembers = async () => {
    try { const { data } = await api.get(`/api/communities/${id}/members`); setMembers(data); }
    catch { setMembers([]); }
  };

  const fetchRequests = async () => {
    try { const { data } = await api.get(`/api/communities/${id}/requests`); setRequests(data); }
    catch { setRequests([]); }
  };

  useEffect(() => {
    (async () => { setLoading(true); await fetchCommunity(); setLoading(false); })();
  }, [id]);

  useEffect(() => {
    if (!community) return;
    if (activeTab === "Posts") fetchPosts();
    if (activeTab === "Members") fetchMembers();
    if (activeTab === "Requests") fetchRequests();
  }, [activeTab, community?.id]);

  useEffect(() => { if (community) fetchPosts(); }, [community?.id]);

  const myRole = community?.my_role;
  const isMember = myRole === "owner" || myRole === "moderator" || myRole === "member";
  const isOwnerOrMod = myRole === "owner" || myRole === "moderator";

  const handleJoin = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try { await api.post(`/api/communities/${id}/join`); await fetchCommunity(); }
    catch (err) { alert(err.response?.data?.detail || "Failed to join"); }
    finally { setActionLoading(false); }
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this community?")) return;
    if (actionLoading) return;
    setActionLoading(true);
    try { await api.delete(`/api/communities/${id}/leave`); await fetchCommunity(); }
    catch (err) { alert(err.response?.data?.detail || "Failed to leave"); }
    finally { setActionLoading(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadError("");
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { setUploadError("Only JPEG, PNG, or WebP allowed."); return; }
    if (file.size > 8 * 1024 * 1024) { setUploadError("Image must be under 8 MB."); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data: uploaded } = await api.post("/api/media/upload-community-avatar", form, { headers: { "Content-Type": "multipart/form-data" } });
      await api.put(`/api/communities/${id}`, { avatar_url: uploaded.url });
      await fetchCommunity();
    } catch (err) {
      setUploadError(err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleKick = async (userId) => {
    if (!window.confirm("Kick this member?")) return;
    try { await api.delete(`/api/communities/${id}/members/${userId}`); await fetchMembers(); }
    catch (err) { alert(err.response?.data?.detail || "Failed to kick"); }
  };

  const handleAccept = async (reqId) => {
    try { await api.post(`/api/communities/${id}/requests/${reqId}/accept`); await fetchRequests(); await fetchCommunity(); }
    catch (err) { alert(err.response?.data?.detail || "Failed to accept"); }
  };

  const handleReject = async (reqId) => {
    try { await api.post(`/api/communities/${id}/requests/${reqId}/reject`); await fetchRequests(); }
    catch (err) { alert(err.response?.data?.detail || "Failed to reject"); }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true); setSettingsError("");
    try {
      await api.put(`/api/communities/${id}`, { name: settingsName.trim(), description: settingsDesc.trim() || null, is_private: settingsPrivate });
      await fetchCommunity();
    } catch (err) { setSettingsError(err.response?.data?.detail || "Failed to save"); }
    finally { setSettingsSaving(false); }
  };

  const handleDeleteCommunity = async () => {
    if (!window.confirm(`Delete "${community.name}"? This permanently deletes all posts and data.`)) return;
    if (!window.confirm("Are you absolutely sure? This cannot be undone.")) return;
    try { await api.delete(`/api/communities/${id}`); navigate("/communities"); }
    catch (err) { alert(err.response?.data?.detail || "Failed to delete"); }
  };

  const handlePostUpdate = (updated) => setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
  const handlePostDelete = (postId) => setPosts(prev => prev.filter(p => p.id !== postId));

  const tabs = ["Posts", "Members", ...(isOwnerOrMod ? ["Requests"] : []), ...(myRole === "owner" ? ["Settings"] : [])];

  if (loading) return <div style={{ textAlign: "center", color: theme.textSub, padding: "60px 0" }}>Loading…</div>;
  if (!community) return null;

  let actionLabel = "", actionBg = theme.accent, actionColor = "#fff", actionBorder = "none", actionClick = undefined, actionDisabled = actionLoading;
  if (myRole === "owner") { actionLabel = "You're the owner"; actionBg = theme.cardHover; actionColor = theme.textSub; actionDisabled = true; }
  else if (myRole === "pending") { actionLabel = "Pending approval…"; actionBg = theme.cardHover; actionColor = theme.textSub; actionDisabled = true; }
  else if (isMember) { actionLabel = actionLoading ? "Leaving…" : "Leave"; actionBg = "none"; actionColor = theme.danger; actionBorder = `1px solid ${theme.danger}`; actionClick = handleLeave; }
  else if (community.is_private) { actionLabel = actionLoading ? "Requesting…" : "Request to Join"; actionBg = "none"; actionColor = theme.accent; actionBorder = `1px solid ${theme.accent}`; actionClick = handleJoin; }
  else { actionLabel = actionLoading ? "Joining…" : "Join Community"; actionClick = handleJoin; }

  const showAvatarOverlay = (hoveringAvatar || uploading) && myRole === "owner";

  const input = {
    width: "100%", padding: "9px 12px", border: `1px solid ${theme.inputBorder}`,
    borderRadius: 4, fontSize: 14, fontFamily: "inherit", outline: "none",
    background: theme.input, color: theme.text, boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "12px 10px 80px" : "20px 20px" }}>

      {/* Banner */}
      <div style={{
        background: theme.card, border: `1px solid ${theme.border}`,
        borderRadius: 4, overflow: "hidden", marginBottom: 16,
      }}>
        <div style={{ height: 64, background: `linear-gradient(135deg, ${theme.accent}, #ff6534)` }} />
        <div style={{ padding: "0 20px 16px", display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div
            style={{ position: "relative", cursor: myRole === "owner" ? "pointer" : "default", marginTop: -28, flexShrink: 0 }}
            onClick={() => myRole === "owner" && fileInputRef.current?.click()}
            onMouseEnter={() => setHoveringAvatar(true)}
            onMouseLeave={() => setHoveringAvatar(false)}
          >
            {community.avatar_url
              ? <img src={community.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `3px solid ${theme.card}`, display: "block" }} />
              : <div style={{ width: 56, height: 56, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22, border: `3px solid ${theme.card}` }}>{getInitials(community.name)}</div>
            }
            {showAvatarOverlay && (
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {uploading
                  ? <div style={{ width: 20, height: 20, border: "2px solid #fff", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                }
              </div>
            )}
            {myRole === "owner" && <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleAvatarChange} />}
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 2 }}>c/{community.name}</div>
            {community.description && <div style={{ fontSize: 13, color: theme.textSub, marginBottom: 6, lineHeight: 1.5 }}>{community.description}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: theme.textSub, flexWrap: "wrap" }}>
              <span>👥 {community.member_count} {community.member_count === 1 ? "member" : "members"}</span>
              {community.is_private && <span style={{ background: theme.cardHover, borderRadius: 10, padding: "1px 7px", fontWeight: 700 }}>🔒 Private</span>}
            </div>
            {uploadError && <div style={{ fontSize: 12, color: theme.danger, marginTop: 4 }}>{uploadError}</div>}
          </div>

          <button
            onClick={actionClick}
            disabled={actionDisabled}
            style={{
              marginTop: isMobile ? 0 : 8, padding: "7px 18px", borderRadius: 20, border: actionBorder,
              fontWeight: 700, fontSize: 13, cursor: actionDisabled ? "default" : "pointer",
              background: actionBg, color: actionColor, fontFamily: "inherit", flexShrink: 0,
            }}
          >
            {actionLabel}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4, marginBottom: 16, overflow: "hidden" }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: "10px 0", textAlign: "center", fontSize: 13,
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? theme.accent : theme.textSub,
              borderBottom: activeTab === tab ? `2px solid ${theme.accent}` : "2px solid transparent",
              cursor: "pointer", background: "none", border: "none",
              borderBottom: activeTab === tab ? `2px solid ${theme.accent}` : "2px solid transparent",
              fontFamily: "inherit",
            }}
          >
            {tab}
            {tab === "Requests" && requests.length > 0 && (
              <span style={{ marginLeft: 4, background: theme.danger, color: "#fff", borderRadius: "50%", fontSize: 9, fontWeight: 700, padding: "1px 5px" }}>
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Posts */}
      {activeTab === "Posts" && (
        <div>
          {community.is_private && !isMember ? (
            <div style={{ textAlign: "center", color: theme.textSub, padding: "40px 20px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4 }}>
              🔒 This is a private community. Join to see posts.
            </div>
          ) : (
            <>
              {isMember && (
                <button
                  style={{
                    display: "block", width: "100%", padding: "10px 14px",
                    background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4,
                    fontSize: 14, color: theme.textSub, textAlign: "left",
                    cursor: "pointer", marginBottom: 12, fontFamily: "inherit",
                  }}
                  onClick={() => navigate(`/submit?communityId=${id}`)}
                >
                  ✏️ Create a post in c/{community.name}
                </button>
              )}
              {posts.length === 0
                ? <div style={{ textAlign: "center", color: theme.textSub, padding: "30px 0", fontSize: 14 }}>No posts yet.</div>
                : posts.map(post => <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} onDelete={handlePostDelete} />)
              }
            </>
          )}
        </div>
      )}

      {/* Members */}
      {activeTab === "Members" && (
        <div>
          {members.length === 0
            ? <div style={{ textAlign: "center", color: theme.textSub, padding: "30px 0" }}>No members yet.</div>
            : members.map(m => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4, marginBottom: 8 }}>
                {m.user.avatar_url
                  ? <img src={m.user.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 38, height: 38, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{getInitials(m.user.name)}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: theme.text }}>
                    {m.role === "owner" ? "🌟 " : m.role === "moderator" ? "⭐ " : ""}
                    {m.user.name}
                    <span style={{
                      marginLeft: 6, fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "1px 7px",
                      background: m.role === "owner" ? "#fff3cd" : m.role === "moderator" ? "#d4edda" : theme.cardHover,
                      color: m.role === "owner" ? "#856404" : m.role === "moderator" ? "#155724" : theme.textSub,
                    }}>{m.role}</span>
                  </div>
                  {m.user.username && <div style={{ fontSize: 12, color: theme.textSub }}>@{m.user.username}</div>}
                </div>
                {isOwnerOrMod && m.user.id !== user?.id && m.user.id !== community.owner_id && (
                  <button onClick={() => handleKick(m.user.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: theme.danger, fontWeight: 600, padding: "4px 8px", fontFamily: "inherit" }}>
                    Kick
                  </button>
                )}
              </div>
            ))
          }
        </div>
      )}

      {/* Requests */}
      {activeTab === "Requests" && isOwnerOrMod && (
        <div>
          {requests.length === 0
            ? <div style={{ textAlign: "center", color: theme.textSub, padding: "30px 0" }}>No pending join requests.</div>
            : requests.map(req => (
              <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4, marginBottom: 8, flexWrap: "wrap" }}>
                {req.user.avatar_url
                  ? <img src={req.user.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 38, height: 38, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{getInitials(req.user.name)}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: theme.text }}>{req.user.name}</div>
                  {req.user.username && <div style={{ fontSize: 12, color: theme.textSub }}>@{req.user.username}</div>}
                  <div style={{ fontSize: 11, color: theme.textSub, marginTop: 2 }}>{new Date(req.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                  <button onClick={() => handleAccept(req.id)} style={{ padding: "6px 14px", background: theme.success, color: "#fff", border: "none", borderRadius: 20, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Accept</button>
                  <button onClick={() => handleReject(req.id)} style={{ padding: "6px 14px", background: theme.cardHover, color: theme.textSub, border: `1px solid ${theme.border}`, borderRadius: 20, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Deny</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Settings */}
      {activeTab === "Settings" && myRole === "owner" && (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>Community Settings</div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Name</label>
            <input style={input} value={settingsName} onChange={e => setSettingsName(e.target.value)} maxLength={50} onFocus={e => e.currentTarget.style.borderColor = theme.accent} onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Description</label>
            <textarea style={{ ...input, resize: "vertical", minHeight: 80 }} value={settingsDesc} onChange={e => setSettingsDesc(e.target.value)} maxLength={300} rows={3} onFocus={e => e.currentTarget.style.borderColor = theme.accent} onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder} />
            <div style={{ fontSize: 11, color: theme.textSub, textAlign: "right" }}>{settingsDesc.length}/300</div>
          </div>

          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" id="s-priv" checked={settingsPrivate} onChange={e => setSettingsPrivate(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer", accentColor: theme.accent }} />
            <label htmlFor="s-priv" style={{ fontSize: 14, color: theme.text, cursor: "pointer" }}>Private community (members must request to join)</label>
          </div>

          {settingsError && <div style={{ color: theme.danger, fontSize: 13, marginBottom: 10 }}>{settingsError}</div>}

          <button
            onClick={handleSaveSettings}
            disabled={settingsSaving || !settingsName.trim()}
            style={{ padding: "8px 22px", background: theme.accent, color: "#fff", border: "none", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: settingsSaving ? "not-allowed" : "pointer", opacity: settingsSaving ? 0.7 : 1, fontFamily: "inherit" }}
          >
            {settingsSaving ? "Saving…" : "Save Changes"}
          </button>

          <div style={{ borderTop: `1px solid ${theme.border}`, margin: "20px 0 16px" }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.danger, marginBottom: 6 }}>Danger Zone</div>
          <p style={{ fontSize: 13, color: theme.textSub, marginBottom: 12 }}>Permanently deletes the community, all posts, comments, and media. Cannot be undone.</p>
          <button
            onClick={handleDeleteCommunity}
            style={{ padding: "8px 22px", background: "none", color: theme.danger, border: `1.5px solid ${theme.danger}`, borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            Delete Community
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
