import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";

const NAVBAR_H = 48;
const MOBILE_TOP_H = 48;
const MOBILE_BOT_H = 56;

export default function Chats() {
  const { user: me } = useAuth();
  const { theme } = useTheme();
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
    let active = true;

    const load = async () => {
      try {
        const { data } = await api.get(`/api/chats/${selected.id}/messages`);
        if (!active) return;
        setMessages(data);
        if (data.length) lastIdRef.current = data[data.length - 1].id;
      } catch {}

      if (!active) return;
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await api.get(`/api/chats/${selected.id}/messages?since_id=${lastIdRef.current}`);
          if (active && data.length) {
            lastIdRef.current = data[data.length - 1].id;
            setMessages(prev => [...prev, ...data]);
          }
        } catch {}
      }, 2000);
    };

    load();
    return () => { active = false; clearInterval(pollRef.current); };
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
    setSearch(""); setSearchResults([]);
    if (isMobile) setMobileChatOpen(true);
  };

  const isFriend = (userId) => friends.some(f => f.id === userId);

  const fmtTime = (iso) => {
    const d = new Date(iso);
    const isToday = d.toDateString() === new Date().toDateString();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return isToday ? time : d.toLocaleDateString([], { day: "numeric", month: "short" }) + ", " + time;
  };

  const Avatar = ({ user, size = 36 }) => user.avatar_url
    ? <img src={user.avatar_url} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: Math.floor(size * 0.38), flexShrink: 0 }}>{user.name.charAt(0).toUpperCase()}</div>;

  const showSidebar = !isMobile || !mobileChatOpen;
  const showChat = !isMobile || mobileChatOpen;

  const rootHeight = isMobile
    ? `calc(100vh - ${MOBILE_TOP_H}px - ${MOBILE_BOT_H}px - env(safe-area-inset-bottom, 0px))`
    : `calc(100vh - ${NAVBAR_H}px)`;

  return (
    <div style={{ display: "flex", height: rootHeight, overflow: "hidden", background: theme.bg }}>

      {/* Sidebar */}
      {showSidebar && (
        <div style={{
          width: isMobile ? "100%" : 280,
          minWidth: isMobile ? "100%" : 280,
          background: theme.card,
          borderRight: isMobile ? "none" : `1px solid ${theme.border}`,
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ padding: "12px 12px 10px", borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 10 }}>Chats</div>
            <div style={{ position: "relative" }}>
              <input
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  border: `1px solid ${theme.inputBorder}`,
                  borderRadius: 20,
                  fontSize: 14,
                  outline: "none",
                  background: theme.input,
                  color: theme.text,
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
                placeholder="Search by @username"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onBlur={() => setTimeout(() => setSearchResults([]), 200)}
                onFocus={e => e.currentTarget.style.borderColor = theme.accent}
              />
              {searchResults.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                  background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4,
                  zIndex: 100, boxShadow: theme.shadowMd, maxHeight: 240, overflowY: "auto",
                }}>
                  {searchResults.map(u => (
                    <div
                      key={u.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                        cursor: "pointer", fontSize: 14,
                        background: hoveredDrop === u.id ? theme.cardHover : "none",
                      }}
                      onMouseEnter={() => setHoveredDrop(u.id)}
                      onMouseLeave={() => setHoveredDrop(null)}
                      onMouseDown={() => {
                        if (isFriend(u.id)) selectFriend(u);
                        else navigate(`/users/${u.id}`);
                      }}
                    >
                      <Avatar user={u} size={30} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: theme.text }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: isFriend(u.id) ? theme.accent : theme.textSub }}>
                          {u.username ? `@${u.username}` : ""} {isFriend(u.id) ? "· friend" : "· not a friend"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {friends.length === 0 ? (
              <div style={{ padding: 20, color: theme.textSub, fontSize: 13, textAlign: "center" }}>
                No friends yet.<br />Add some to start chatting!
              </div>
            ) : (
              friends.map(f => (
                <div
                  key={f.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 14px", cursor: "pointer",
                    borderLeft: !isMobile && selected?.id === f.id ? `3px solid ${theme.accent}` : "3px solid transparent",
                    background: !isMobile && selected?.id === f.id ? (theme.cardHover) : "none",
                  }}
                  onClick={() => selectFriend(f)}
                  onMouseEnter={e => { if (!(!isMobile && selected?.id === f.id)) e.currentTarget.style.background = theme.cardHover; }}
                  onMouseLeave={e => { if (!(!isMobile && selected?.id === f.id)) e.currentTarget.style.background = "none"; }}
                >
                  <Avatar user={f} size={38} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: theme.text }}>{f.name}</div>
                    {f.username && <div style={{ fontSize: 12, color: theme.textSub }}>@{f.username}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chat area */}
      {showChat && selected && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px",
            background: theme.card,
            borderBottom: `1px solid ${theme.border}`,
          }}>
            {isMobile && (
              <button
                onClick={() => { setMobileChatOpen(false); setSelected(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: theme.accent, padding: "0 6px 0 0", lineHeight: 1 }}
              >
                ←
              </button>
            )}
            <Avatar user={selected} size={38} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: theme.text }}>{selected.name}</div>
              {selected.username && <div style={{ fontSize: 12, color: theme.textSub }}>@{selected.username}</div>}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px", display: "flex", flexDirection: "column", gap: 4, background: theme.bg }}>
            {messages.map((msg, idx) => {
              const mine = msg.sender_id === me?.id;
              const isLastReadSent = mine && msg.read && (
                idx === messages.length - 1 ||
                !messages.slice(idx + 1).some(m => m.sender_id === me?.id && m.read)
              );
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "72%",
                    padding: "8px 12px",
                    borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: mine ? theme.accent : theme.card,
                    color: mine ? "#fff" : theme.text,
                    border: mine ? "none" : `1px solid ${theme.border}`,
                    fontSize: 14,
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: 10, color: theme.textSub, marginTop: 2 }}>
                    {fmtTime(msg.created_at)}
                    {isLastReadSent && <span style={{ marginLeft: 6, color: theme.link }}>· Seen ✓</span>}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form
            style={{
              display: "flex", gap: 8, padding: "10px 12px",
              background: theme.card,
              borderTop: `1px solid ${theme.border}`,
            }}
            onSubmit={handleSend}
          >
            <input
              ref={inputRef}
              style={{
                flex: 1, padding: "9px 14px",
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 20, fontSize: 14, outline: "none",
                fontFamily: "inherit", background: theme.input, color: theme.text,
              }}
              placeholder={`Message ${selected.name}…`}
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus={!isMobile}
              onFocus={e => e.currentTarget.style.borderColor = theme.accent}
              onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
            />
            <button
              style={{
                padding: "9px 18px", background: theme.accent, color: "#fff",
                border: "none", borderRadius: 20, fontWeight: 700, cursor: "pointer",
                fontSize: 14, whiteSpace: "nowrap", fontFamily: "inherit",
                opacity: (!newMsg.trim() || sending) ? 0.5 : 1,
              }}
              type="submit"
              disabled={sending || !newMsg.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Welcome screen (desktop) */}
      {!isMobile && !selected && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: theme.textSub }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: theme.text }}>Your messages</div>
          <div style={{ fontSize: 14 }}>Select a friend to start chatting</div>
        </div>
      )}
    </div>
  );
}
