import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const MAX_COMMENT = 1000;

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function buildTree(comments) {
  const map = {};
  const roots = [];
  comments.forEach(c => { map[c.id] = { ...c, _replies: [] }; });
  comments.forEach(c => {
    if (c.parent_comment_id && map[c.parent_comment_id]) {
      map[c.parent_comment_id]._replies.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  });
  return roots;
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const textareaRef = useRef(null);

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [likeLoading, setLikeLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/api/posts/${id}`),
      api.get(`/api/posts/${id}/comments`),
    ])
      .then(([postRes, commentsRes]) => {
        setPost(postRes.data);
        setComments(commentsRes.data);
      })
      .catch(() => navigate("/", { replace: true }))
      .finally(() => setPageLoading(false));
  }, [id, navigate]);

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      const { data } = await api.post(`/api/posts/${post.id}/like`);
      setPost(data);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Delete this post?")) return;
    await api.delete(`/api/posts/${post.id}`);
    navigate("/");
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;
    setSubmitting(true); setCommentError("");
    try {
      const { data } = await api.post(`/api/posts/${post.id}/comments`, { content: trimmed });
      setComments(prev => [...prev, data]);
      setCommentText("");
      setPost(prev => ({ ...prev, comment_count: prev.comment_count + 1 }));
    } catch (err) {
      const detail = err.response?.data?.detail;
      setCommentError(Array.isArray(detail) ? detail.map(d => d.msg).join(", ") : detail || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId) => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    setReplySubmitting(true);
    try {
      const { data } = await api.post(`/api/posts/${post.id}/comments`, { content: trimmed, parent_comment_id: parentId });
      setComments(prev => [...prev, data]);
      setPost(prev => ({ ...prev, comment_count: prev.comment_count + 1 }));
      setReplyingTo(null); setReplyText("");
    } catch {
      // silent
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    await api.delete(`/api/posts/${post.id}/comments/${commentId}`);
    const idsToRemove = new Set();
    const collectIds = (cid) => {
      idsToRemove.add(cid);
      comments.filter(c => c.parent_comment_id === cid).forEach(c => collectIds(c.id));
    };
    collectIds(commentId);
    setComments(prev => prev.filter(c => !idsToRemove.has(c.id)));
    setPost(prev => ({ ...prev, comment_count: Math.max(0, prev.comment_count - idsToRemove.size) }));
  };

  const renderComment = (c, depth = 0) => {
    const initials = c.author.name.charAt(0).toUpperCase();
    const isReplying = replyingTo === c.id;
    const avatarSize = depth === 0 ? 32 : 26;

    return (
      <div key={c.id} style={{ marginLeft: depth > 0 ? 16 : 0, borderLeft: depth > 0 ? `2px solid ${theme.border}` : "none", paddingLeft: depth > 0 ? 12 : 0, marginBottom: 2 }}>
        <div style={{ display: "flex", gap: 8, padding: "8px 0" }}>
          <div
            style={{ cursor: "pointer", flexShrink: 0 }}
            onClick={() => navigate(`/users/${c.author.id}`)}
          >
            {c.author.avatar_url
              ? <img src={c.author.avatar_url} alt="" style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", objectFit: "cover" }} />
              : <div style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", background: theme.cardHover, color: theme.textSub, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: avatarSize * 0.4 }}>{initials}</div>
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
              <span
                style={{ fontSize: 13, fontWeight: 700, color: theme.text, cursor: "pointer" }}
                onClick={() => navigate(`/users/${c.author.id}`)}
              >
                u/{c.author.username || c.author.name}
              </span>
              <span style={{ fontSize: 11, color: theme.textSub }}>{timeAgo(c.created_at)}</span>
            </div>

            <p style={{ fontSize: 14, color: theme.text, lineHeight: 1.5, whiteSpace: "pre-wrap", margin: 0, marginBottom: 4 }}>
              {c.content}
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {depth < 3 && (
                <button
                  onClick={() => { setReplyingTo(isReplying ? null : c.id); setReplyText(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: theme.textSub, padding: "2px 6px", borderRadius: 2, fontFamily: "inherit" }}
                  onMouseEnter={e => e.currentTarget.style.background = theme.cardHover}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  {isReplying ? "Cancel" : "Reply"}
                </button>
              )}
              {user?.id === c.author.id && (
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: theme.danger, padding: "2px 6px", borderRadius: 2, fontFamily: "inherit" }}
                >
                  Delete
                </button>
              )}
            </div>

            {isReplying && (
              <div style={{ marginTop: 8 }}>
                <textarea
                  autoFocus
                  style={{
                    width: "100%", border: `1px solid ${theme.inputBorder}`, borderRadius: 4,
                    padding: "7px 10px", fontSize: 13, fontFamily: "inherit", resize: "vertical",
                    minHeight: 56, boxSizing: "border-box", outline: "none",
                    background: theme.input, color: theme.text,
                  }}
                  placeholder={`Reply to u/${c.author.username || c.author.name}…`}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value.slice(0, MAX_COMMENT))}
                  onFocus={e => e.currentTarget.style.borderColor = theme.accent}
                  onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
                />
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
                  <button
                    onClick={() => { setReplyingTo(null); setReplyText(""); }}
                    style={{ padding: "5px 14px", background: "none", color: theme.textSub, border: `1px solid ${theme.border}`, borderRadius: 20, fontWeight: 700, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!replyText.trim() || replySubmitting}
                    onClick={() => handleSubmitReply(c.id)}
                    style={{
                      padding: "5px 16px", background: theme.accent, color: "#fff", border: "none",
                      borderRadius: 20, fontWeight: 700, cursor: (!replyText.trim() || replySubmitting) ? "not-allowed" : "pointer",
                      fontSize: 12, opacity: (!replyText.trim() || replySubmitting) ? 0.5 : 1, fontFamily: "inherit",
                    }}
                  >
                    {replySubmitting ? "Posting…" : "Reply"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {c._replies && c._replies.map(r => renderComment(r, depth + 1))}
      </div>
    );
  };

  if (pageLoading) return <div style={{ textAlign: "center", color: theme.textSub, padding: "60px 0", fontSize: 15 }}>Loading…</div>;
  if (!post) return null;

  const postInitials = post.author.name.charAt(0).toUpperCase();
  const myInitials = user?.name?.charAt(0).toUpperCase() ?? "?";
  const canComment = commentText.trim().length > 0 && !submitting;
  const tree = buildTree(comments);

  return (
    <div style={{ maxWidth: 740, margin: "0 auto", padding: "16px 12px 80px" }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: "none", border: "none", cursor: "pointer", color: theme.link, fontSize: 13, fontWeight: 700, padding: "4px 0", marginBottom: 12, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        ← Back
      </button>

      {/* Post card */}
      <div style={{ display: "flex", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4, marginBottom: 12, overflow: "hidden" }}>
        {/* Vote column */}
        <div style={{ width: 40, background: theme.cardHover, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0", gap: 2, flexShrink: 0 }}>
          <button
            onClick={handleLike}
            disabled={likeLoading}
            style={{ background: "none", border: "none", cursor: likeLoading ? "wait" : "pointer", color: post.liked_by_me ? theme.upvote : theme.textSub, fontSize: 18, lineHeight: 1, padding: "2px 0", fontWeight: 700 }}
          >
            ▲
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: post.liked_by_me ? theme.upvote : theme.text, textAlign: "center" }}>
            {post.like_count}
          </span>
        </div>

        <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
          {/* Meta */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6, fontSize: 12, color: theme.textSub }}>
            {post.community && (
              <>
                <span style={{ fontWeight: 700, color: theme.text, cursor: "pointer" }} onClick={() => navigate(`/communities/${post.community.id}`)}>
                  c/{post.community.name}
                </span>
                <span>·</span>
              </>
            )}
            <span style={{ cursor: "pointer" }} onClick={() => navigate(`/users/${post.author.id}`)}>
              u/{post.author.username || post.author.name}
            </span>
            <span>· {timeAgo(post.created_at)}</span>
          </div>

          {post.title && <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text, lineHeight: 1.3, marginBottom: 10, margin: "0 0 10px" }}>{post.title}</h1>}

          {post.content && post.content.trim() && (
            <p style={{ fontSize: 15, lineHeight: 1.65, color: theme.text, whiteSpace: "pre-wrap", margin: "0 0 12px" }}>{post.content}</p>
          )}

          {post.link_url && (
            <a href={post.link_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 13, color: theme.link, wordBreak: "break-all", marginBottom: 12, textDecoration: "none" }}>
              🔗 {post.link_url}
            </a>
          )}

          {post.media_url && post.media_type === "image" && (
            <img src={post.media_url} alt="" style={{ width: "100%", maxHeight: 600, objectFit: "contain", borderRadius: 4, marginBottom: 12, display: "block", background: theme.cardHover }} />
          )}
          {post.media_url && post.media_type === "video" && (
            <video src={post.media_url} controls style={{ width: "100%", maxHeight: 500, borderRadius: 4, marginBottom: 12, display: "block", background: theme.cardHover }} />
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 4, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.textSub }}>
              💬 {post.comment_count} {post.comment_count === 1 ? "Comment" : "Comments"}
            </span>
            {user?.id === post.author.id && (
              <button onClick={handleDeletePost} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: theme.danger, fontFamily: "inherit" }}>
                Delete post
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Comments */}
      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4, padding: "16px 14px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
          Comments ({post.comment_count})
        </div>

        {/* New comment input */}
        <form onSubmit={handleSubmitComment} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, marginTop: 2 }} />
              : <div style={{ width: 32, height: 32, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: 2 }}>{myInitials}</div>
            }
            <div style={{ flex: 1 }}>
              <textarea
                ref={textareaRef}
                style={{
                  width: "100%", border: `1px solid ${theme.inputBorder}`, borderRadius: 4,
                  padding: "9px 12px", fontSize: 14, fontFamily: "inherit", resize: "vertical",
                  minHeight: 80, boxSizing: "border-box", outline: "none",
                  background: theme.input, color: theme.text,
                }}
                placeholder="Add a comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value.slice(0, MAX_COMMENT))}
                onFocus={e => e.currentTarget.style.borderColor = theme.accent}
                onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: theme.textSub }}>{commentText.length}/{MAX_COMMENT}</span>
                <button
                  type="submit"
                  disabled={!canComment}
                  style={{
                    padding: "6px 18px", background: theme.accent, color: "#fff", border: "none",
                    borderRadius: 20, fontWeight: 700, fontSize: 13,
                    cursor: canComment ? "pointer" : "not-allowed", opacity: canComment ? 1 : 0.5, fontFamily: "inherit",
                  }}
                >
                  {submitting ? "Posting…" : "Comment"}
                </button>
              </div>
              {commentError && <div style={{ color: theme.danger, fontSize: 13, marginTop: 6 }}>{commentError}</div>}
            </div>
          </div>
        </form>

        {tree.length === 0
          ? <div style={{ textAlign: "center", color: theme.textSub, padding: "20px 0", fontSize: 14 }}>No comments yet — be the first!</div>
          : <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>{tree.map(c => renderComment(c, 0))}</div>
        }
      </div>
    </div>
  );
}
