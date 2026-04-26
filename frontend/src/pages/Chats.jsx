import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";

const NAVBAR_H = 56; // desktop top-nav height
const MOBILE_TOP_H = 52; // mobile slim top-bar height
const MOBILE_BOT_H = 60; // mobile bottom-tab-bar height

const s = {
  // Root fills remaining viewport height
  root: (isMobile) => ({
    display: "flex",
    height: isMobile
      ? `calc(100vh - ${MOBILE_TOP_H}px - ${MOBILE_BOT_H}px - env(safe-area-inset-bottom, 0px))`
      : `calc(100vh - ${NAVBAR_H}px)`,
    overflow: "hidden",
    background: "#f0f2f5",
  }),

  // ── Sidebar ──────────────────────────────────────────────────────
  sidebar: (isMobile) => ({
    width: isMobile ? "100%" : 280,
    minWidth: isMobile ? "100%" : 280,
    background: "#fff",
    borderRight: isMobile ? "none" : "1px solid #e4e6eb",
    display: "flex",
    flexDirection: "column",
  }),
  sidebarHead: { padding: "14px 12px 10px", borderBottom: "1px solid #e4e6eb" },
  sidebarTitle: { fontSize: 18, fontWeight: 700, marginBottom: 10 },
  searchWrap: { position: "relative" },
  searchInput: { width: "100%", padding: "8px 12px", border: "1px solid #ccd0d5", borderRadius: 20, fontSize: 14, outline: "none", boxSizing: "border-box" },
  dropdown: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e4e6eb", borderRadius: 8, zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", maxHeight: 240, overflowY: "auto" },
  dropItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer", fontSize: 14 },
  dropItemHover: { background: "#f0f2f5" },
  friendList: { flex: 1, overflowY: "auto" },
  friendItem: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer", borderLeft: "3px solid transparent" },
  friendItemActive: { background: "#e7f3ff", borderLeft: "3px solid #1877f2" },
  friendName: { fontWeight: 600, fontSize: 15 },
  friendUser: { fontSize: 12, color: "#65676b" },
  emptyFriends: { padding: 20, color: "#65676b", fontSize: 13, textAlign: "center" },

  // ── Avatar ───────────────────────────────────────────────────────
  av: { borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  avPh: (size) => ({
    width: size, height: size, borderRadius: "50%", background: "#1877f2",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: Math.floor(size * 0.4), flexShrink: 0,
  }),

  // ── Chat area ────────────────────────────────────────────────────
  chatArea: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  chatHeader: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#fff", borderBottom: "1px solid #e4e6eb" },
  backBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#1877f2", padding: "0 8px 0 0", lineHeight: 1 },
  chatHeaderName: { fontWeight: 700, fontSize: 16 },
  chatHeaderUser: { fontSize: 13, color: "#65676b" },
  messages: { flex: 1, overflowY: "auto", padding: "16px 16px", display: "flex", flexDirection: "column", gap: 6 },
  bubble: (mine) => ({
    maxWidth: "72%",
    padding: "8px 12px",
    borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
    background: mine ? "#1877f2" : "#f0f2f5",
    color: mine ? "#fff" : "#1c1e21",
    fontSize: 14,
    lineHeight: 1.5,
    alignSelf: mine ? "flex-end" : "flex-start",
    wordBreak: "break-word",
  }),
  bubbleTime: (mine) => ({ fontSize: 10, color: mine ? "rgba(255,255,255,0.7)" : "#65676b", marginTop: 2, textAlign: mine ? "right" : "left" }),
  inputRow: { display: "flex", gap: 8, padding: "10px 12px", background: "#fff", borderTop: "1px solid #e4e6eb" },
  msgInput: { flex: 1, padding: "10px 14px", border: "1px solid #ccd0d5", borderRadius: 20, fontSize: 14, outline: "none", fontFamily: "inherit" },
  sendBtn: { padding: "10px 18px", background: "#1877f2", color: "#fff", border: "none", borderRadius: 20, fontWeight: 700, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" },

  // ── Welcome (desktop only) ───────────────────────────────────────
  welcome: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#65676b" },
  welcomeIcon: { fontSize: 48, marginBottom: 12 },
  welcomeTitle: { fontSize: 20, fontWeight: 700, marginBottom: 6, color: "#1c1e21" },
  welcomeSub: { fontSize: 14 },
};

export default function Chats() {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [hoveredDrop, setHoveredDrop] = useState(null);

  const messagesEndRef = useRef(null);
  const lastIdRef = useRef(0);
  const pollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api.get("/api/friends").then(({ data }) => setFriends(data));
  }, []);

  useEffect(() => {
    if (search.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/users/search?q=${encodeURIComponent(search)}`)
        .then(({ data }) => setSearchResults(data))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!selected) return;
    lastIdRef.current = 0;
    setMessages([]);
    api.get(`/api/chats/${selected.id}/messages`).then(({ data }) => {
      setMessages(data);
      if (data.length) lastIdRef.current = data[data.length - 1].id;
    });
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/api/chats/${selected.id}/messages?since_id=${lastIdRef.current}`);
        if (data.length) {
          lastIdRef.current = data[data.length - 1].id;
          setMessages(prev => [...prev, ...data]);
        }
      } catch (_) {}
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, [selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selected || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/api/chats/${selected.id}/messages`, { content: newMsg.trim() });
      setMessages(prev => [...prev, data]);
      lastIdRef.current = data.id;
      setNewMsg("");
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); }
  };

  const selectFriend = (f) => {
    setSelected(f);
    setSearch("");
    setSearchResults([]);
    if (isMobile) setMobileChatOpen(true);
  };

  const goBackToSidebar = () => {
    setMobileChatOpen(false);
    setSelected(null);
  };

  const isFriend = (userId) => friends.some(f => f.id === userId);

  const fmtTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return time;
    return d.toLocaleDateString([], { day: "numeric", month: "short" }) + ", " + time;
  };

  const Avatar = ({ user, size = 38 }) => user.avatar_url
    ? <img src={user.avatar_url} alt="" style={{ ...s.av, width: size, height: size }} />
    : <div style={s.avPh(size)}>{user.name.charAt(0).toUpperCase()}</div>;

  // ── Mobile: show sidebar OR chat, never both ───────────────────────────
  const showSidebar = !isMobile || !mobileChatOpen;
  const showChat = !isMobile || mobileChatOpen;

  return (
    <div style={s.root(isMobile)}>

      {/* ── Sidebar ── */}
      {showSidebar && (
        <div style={s.sidebar(isMobile)}>
          <div style={s.sidebarHead}>
            <div style={s.sidebarTitle}>Chats</div>
            <div style={s.searchWrap}>
              <input
                style={s.searchInput}
                placeholder="Search by @username"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onBlur={() => setTimeout(() => setSearchResults([]), 200)}
              />
              {searchResults.length > 0 && (
                <div style={s.dropdown}>
                  {searchResults.map(u => (
                    <div
                      key={u.id}
                      style={{ ...s.dropItem, ...(hoveredDrop === u.id ? s.dropItemHover : {}) }}
                      onMouseEnter={() => setHoveredDrop(u.id)}
                      onMouseLeave={() => setHoveredDrop(null)}
                      onMouseDown={() => {
                        if (isFriend(u.id)) selectFriend(u);
                        else navigate(`/users/${u.id}`);
                      }}
                    >
                      <Avatar user={u} size={32} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: isFriend(u.id) ? "#1877f2" : "#65676b" }}>
                          {u.username ? `@${u.username}` : ""} {isFriend(u.id) ? "· friend" : "· not a friend"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={s.friendList}>
            {friends.length === 0
              ? <div style={s.emptyFriends}>No friends yet.<br />Add some to start chatting!</div>
              : friends.map(f => (
                  <div
                    key={f.id}
                    style={{ ...s.friendItem, ...(!isMobile && selected?.id === f.id ? s.friendItemActive : {}) }}
                    onClick={() => selectFriend(f)}
                  >
                    <Avatar user={f} size={40} />
                    <div>
                      <div style={s.friendName}>{f.name}</div>
                      {f.username && <div style={s.friendUser}>@{f.username}</div>}
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      )}

      {/* ── Chat area ── */}
      {showChat && selected && (
        <div style={s.chatArea}>
          <div style={s.chatHeader}>
            {/* Back button on mobile */}
            {isMobile && (
              <button style={s.backBtn} onClick={goBackToSidebar}>←</button>
            )}
            <Avatar user={selected} size={40} />
            <div>
              <div style={s.chatHeaderName}>{selected.name}</div>
              {selected.username && <div style={s.chatHeaderUser}>@{selected.username}</div>}
            </div>
          </div>

          <div style={s.messages}>
            {messages.map((msg, idx) => {
              const mine = msg.sender_id === me?.id;
              const isLastReadSent = mine && msg.read && (
                idx === messages.length - 1 ||
                !messages.slice(idx + 1).some(m => m.sender_id === me?.id && m.read)
              );
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                  <div style={s.bubble(mine)}>{msg.content}</div>
                  <div style={s.bubbleTime(mine)}>
                    {fmtTime(msg.created_at)}
                    {isLastReadSent && <span style={{ marginLeft: 6, color: "#1877f2" }}>· Seen ✓</span>}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form style={s.inputRow} onSubmit={handleSend}>
            <input
              ref={inputRef}
              style={s.msgInput}
              placeholder={`Message ${selected.name}…`}
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus={!isMobile}
            />
            <button style={s.sendBtn} type="submit" disabled={sending || !newMsg.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      {/* ── Welcome screen (desktop only, no friend selected) ── */}
      {!isMobile && !selected && (
        <div style={s.welcome}>
          <div style={s.welcomeIcon}>💬</div>
          <div style={s.welcomeTitle}>Your messages</div>
          <div style={s.welcomeSub}>Select a friend from the left to start chatting</div>
        </div>
      )}
    </div>
  );
}
