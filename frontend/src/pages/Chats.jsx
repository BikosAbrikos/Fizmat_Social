import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const NAVBAR_H = 56;

const s = {
  root: { display: "flex", height: `calc(100vh - ${NAVBAR_H}px)`, overflow: "hidden", background: "#f0f2f5" },

  // ── Sidebar ──────────────────────────────────────────────────────
  sidebar: { width: 280, minWidth: 280, background: "#fff", borderRight: "1px solid #e4e6eb", display: "flex", flexDirection: "column" },
  sidebarHead: { padding: "14px 12px 10px", borderBottom: "1px solid #e4e6eb" },
  sidebarTitle: { fontSize: 18, fontWeight: 700, marginBottom: 10 },
  searchWrap: { position: "relative" },
  searchInput: { width: "100%", padding: "8px 12px", border: "1px solid #ccd0d5", borderRadius: 20, fontSize: 14, outline: "none", boxSizing: "border-box" },
  dropdown: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e4e6eb", borderRadius: 8, zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", maxHeight: 240, overflowY: "auto" },
  dropItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer", fontSize: 14 },
  dropItemHover: { background: "#f0f2f5" },
  friendList: { flex: 1, overflowY: "auto" },
  friendItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderLeft: "3px solid transparent" },
  friendItemActive: { background: "#e7f3ff", borderLeft: "3px solid #1877f2" },
  friendName: { fontWeight: 600, fontSize: 14 },
  friendUser: { fontSize: 12, color: "#65676b" },
  emptyFriends: { padding: 20, color: "#65676b", fontSize: 13, textAlign: "center" },

  // ── Avatar ───────────────────────────────────────────────────────
  av: { width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  avPh: (size = 38) => ({ width: size, height: size, borderRadius: "50%", background: "#1877f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.4, flexShrink: 0 }),

  // ── Chat area ────────────────────────────────────────────────────
  chatArea: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  chatHeader: { display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: "#fff", borderBottom: "1px solid #e4e6eb" },
  chatHeaderName: { fontWeight: 700, fontSize: 16 },
  chatHeaderUser: { fontSize: 13, color: "#65676b" },
  messages: { flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 },
  bubble: (mine) => ({
    maxWidth: "65%",
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
  inputRow: { display: "flex", gap: 10, padding: "12px 20px", background: "#fff", borderTop: "1px solid #e4e6eb" },
  msgInput: { flex: 1, padding: "10px 14px", border: "1px solid #ccd0d5", borderRadius: 20, fontSize: 14, outline: "none", fontFamily: "inherit" },
  sendBtn: { padding: "10px 20px", background: "#1877f2", color: "#fff", border: "none", borderRadius: 20, fontWeight: 700, cursor: "pointer", fontSize: 14 },

  // ── Welcome ──────────────────────────────────────────────────────
  welcome: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#65676b" },
  welcomeIcon: { fontSize: 48, marginBottom: 12 },
  welcomeTitle: { fontSize: 20, fontWeight: 700, marginBottom: 6, color: "#1c1e21" },
  welcomeSub: { fontSize: 14 },
};

export default function Chats() {
  const { user: me } = useAuth();
  const navigate = useNavigate();

  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState(null); // friend object
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

  // Load friends on mount
  useEffect(() => {
    api.get("/api/friends").then(({ data }) => setFriends(data));
  }, []);

  // Search users by username
  useEffect(() => {
    if (search.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/users/search?q=${encodeURIComponent(search)}`)
        .then(({ data }) => setSearchResults(data))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load messages when friend selected
  useEffect(() => {
    if (!selected) return;
    lastIdRef.current = 0;
    setMessages([]);
    api.get(`/api/chats/${selected.id}/messages`).then(({ data }) => {
      setMessages(data);
      if (data.length) lastIdRef.current = data[data.length - 1].id;
    });
  }, [selected]);

  // Poll for new messages every 2s
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

  // Auto-scroll to bottom
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

  const selectFriend = (f) => { setSelected(f); setSearch(""); setSearchResults([]); };

  const isFriend = (userId) => friends.some(f => f.id === userId);

  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const Avatar = ({ user, size = 38 }) => user.avatar_url
    ? <img src={user.avatar_url} alt="" style={{ ...s.av, width: size, height: size }} />
    : <div style={s.avPh(size)}>{user.name.charAt(0).toUpperCase()}</div>;

  return (
    <div style={s.root}>

      {/* ── Sidebar ── */}
      <div style={s.sidebar}>
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
                  style={{ ...s.friendItem, ...(selected?.id === f.id ? s.friendItemActive : {}) }}
                  onClick={() => selectFriend(f)}
                >
                  <Avatar user={f} size={38} />
                  <div>
                    <div style={s.friendName}>{f.name}</div>
                    {f.username && <div style={s.friendUser}>@{f.username}</div>}
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* ── Chat area ── */}
      {selected ? (
        <div style={s.chatArea}>
          <div style={s.chatHeader}>
            <Avatar user={selected} size={40} />
            <div>
              <div style={s.chatHeaderName}>{selected.name}</div>
              {selected.username && <div style={s.chatHeaderUser}>@{selected.username}</div>}
            </div>
          </div>

          <div style={s.messages}>
            {messages.map(msg => {
              const mine = msg.sender_id === me?.id;
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                  <div style={s.bubble(mine)}>{msg.content}</div>
                  <div style={s.bubbleTime(mine)}>{fmtTime(msg.created_at)}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form style={s.inputRow} onSubmit={handleSend}>
            <input
              ref={inputRef}
              style={s.msgInput}
              placeholder={`Message ${selected.name}...`}
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button style={s.sendBtn} type="submit" disabled={sending || !newMsg.trim()}>
              Send
            </button>
          </form>
        </div>
      ) : (
        <div style={s.welcome}>
          <div style={s.welcomeIcon}>💬</div>
          <div style={s.welcomeTitle}>Your messages</div>
          <div style={s.welcomeSub}>Select a friend from the left to start chatting</div>
        </div>
      )}
    </div>
  );
}
