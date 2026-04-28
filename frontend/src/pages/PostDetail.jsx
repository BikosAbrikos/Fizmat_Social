import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const s = {
  page: { maxWidth: 740, margin: "0 auto", padding: "24px 16px" },

  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 6, background: "none",
    border: "none", cursor: "pointer", color: "#1877f2", fontSize: 14,
    fontWeight: 600, padding: "4px 0", marginBottom: 16, fontFamily: "inherit",
  },

  card: {
    background: "#fff", borderRadius: 8,
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)", padding: 20, marginBottom: 16,
  },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  avatar: { width: 42, height: 42, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  avatarPlaceholder: {
    width: 42, height: 42, borderRadius: "50%", background: "#1877f2",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 17, flexShrink: 0,
  },
  authorName: { fontWeight: 600, fontSize: 15, cursor: "pointer", color: "#1c1e21" },
  authorUsername: { fontSize: 12, color: "#65676b" },
  date: { fontSize: 12, color: "#65676b", marginLeft: "auto", whiteSpace: "nowrap" },
  title: { fontSize: 22, fontWeight: 700, lineHeight: 1.3, marginBottom: 10, color: "#1c1e21" },
  content: { fontSize: 15, lineHeight: 1.65, color: "#1c1e21", marginBottom: 12, whiteSpace: "pre-wrap" },
  linkBox: {
    display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
    background: "#f0f2f5", borderRadius: 6, border: "1px solid #e4e6eb",
    color: "#1877f2", fontSize: 14, textDecoration: "none",
    wordBreak: "break-all", marginBottom: 12,
  },
  media: {
    width: "100%", maxHeight: 600, objectFit: "contain",
    borderRadius: 8, marginBottom: 12, display: "block", background: "#f0f2f5",
  },
  actions: {
    display: "flex", gap: 10, alignItems: "center",
    paddingTop: 12, borderTop: "1px solid #e4e6eb", marginTop: 4,
  },
  likeBtn: (liked) => ({
    border: "none", background: "none", cursor: "pointer", fontSize: 14,
    fontWeight: 600, padding: "5px 10px", borderRadius: 6,
    color: liked ? "#1877f2" : "#65676b",
  }),
  deletePostBtn: {
    border: "none", background: "none", cursor: "pointer",
    fontSize: 13, color: "#e41749", marginLeft: "auto", fontFamily: "inherit",
  },

  commentsCard: {
    background: "#fff", borderRadius: 8,
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)", padding: 20,
  },
  commentsHeading: { fontSize: 16, fontWeight: 700, color: "#1c1e21", marginBottom: 16 },

  inputRow: { display: "flex", gap: 10, marginBottom: 20 },
  inputAvatar: { width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  inputAvatarPlaceholder: {
    width: 36, height: 36, borderRadius: "50%", background: "#1877f2",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 14, flexShrink: 0,
  },
  inputWrap: { flex: 1 },
  textarea: {
    width: "100%", border: "1px solid #ccd0d5", borderRadius: 8,
    padding: "9px 12px", fontSize: 14, fontFamily: "inherit",
    resize: "vertical", minHeight: 72, boxSizing: "border-box", outline: "none",
  },
  replyTextarea: {
    width: "100%", border: "1px solid #ccd0d5", borderRadius: 8,
    padding: "7px 10px", fontSize: 13, fontFamily: "inherit",
    resize: "vertical", minHeight: 56, boxSizing: "border-box", outline: "none",
  },
  inputFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  charCount: { fontSize: 12, color: "#65676b" },
  submitBtn: (disabled) => ({
    padding: "7px 20px", background: "#1877f2", color: "#fff", border: "none",
    borderRadius: 20, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13, opacity: disabled ? 0.5 : 1, fontFamily: "inherit",
  }),
  cancelBtn: {
    padding: "5px 14px", background: "none", color: "#65676b", border: "none",
    borderRadius: 20, fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
  },
  commentError: { color: "#e41749", fontSize: 13, marginTop: 6 },

  divider: { height: 1, background: "#e4e6eb", margin: "4px 0 16px" },
  commentItem: { display: "flex", gap: 10, marginBottom: 14 },
  commentAvatar: { width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  commentAvatarPlaceholder: {
    width: 34, height: 34, borderRadius: "50%", background: "#e4e6eb",
    color: "#1c1e21", display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 13, flexShrink: 0,
  },
  commentBody: { flex: 1 },
  commentBubble: {
    background: "#f0f2f5", borderRadius: 12, padding: "8px 12px", display: "inline-block",
    maxWidth: "100%",
  },
  commentAuthor: { fontWeight: 600, fontSize: 13, cursor: "pointer", color: "#1c1e21" },
  commentText: { fontSize: 14, lineHeight: 1.5, color: "#1c1e21", whiteSpace: "pre-wrap", marginTop: 2 },
  commentMeta: { display: "flex", alignItems: "center", gap: 12, marginTop: 4, paddingLeft: 2 },
  commentDate: { fontSize: 11, color: "#65676b" },
  commentDeleteBtn: {
    border: "none", background: "none", cursor: "pointer",
    fontSize: 11, color: "#e41749", padding: 0, fontFamily: "inherit",
  },
  replyBtn: {
    border: "none", background: "none", cursor: "pointer",
    fontSize: 11, color: "#1877f2", fontWeight: 600, padding: 0, fontFamily: "inherit",
  },

  noComments: { textAlign: "center", color: "#65676b", padding: "20px 0", fontSize: 14 },
  loading: { textAlign: "center", color: "#65676b", padding: "60px 0", fontSize: 15 },
};

const MAX_COMMENT = 1000;

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
  const textareaRef = useRef(null);

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [likeLoading, setLikeLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null); // comment id
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
    setSubmitting(true);
    setCommentError("");
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
      const { data } = await api.post(`/api/posts/${post.id}/comments`, {
        content: trimmed,
        parent_comment_id: parentId,
      });
      setComments(prev => [...prev, data]);
      setPost(prev => ({ ...prev, comment_count: prev.comment_count + 1 }));
      setReplyingTo(null);
      setReplyText("");
    } catch {
      // silent fail
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    await api.delete(`/api/posts/${post.id}/comments/${commentId}`);
    // Remove comment and any of its replies from flat list
    const idsToRemove = new Set();
    const collectIds = (cid) => {
      idsToRemove.add(cid);
      comments.filter(c => c.parent_comment_id === cid).forEach(c => collectIds(c.id));
    };
    collectIds(commentId);
    const removed = idsToRemove.size;
    setComments(prev => prev.filter(c => !idsToRemove.has(c.id)));
    setPost(prev => ({ ...prev, comment_count: Math.max(0, prev.comment_count - removed) }));
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) +
        " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderComment = (c, depth = 0) => {
    const initials = c.author.name.charAt(0).toUpperCase();
    const isReplying = replyingTo === c.id;
    const avatarSize = depth > 0 ? 28 : 34;
    const avatarStyle = {
      width: avatarSize, height: avatarSize, borderRadius: "50%",
      objectFit: "cover", flexShrink: 0,
    };
    const avatarPlaceholderStyle = {
      ...avatarStyle,
      background: depth > 0 ? "#e4e6eb" : "#e4e6eb",
      color: "#1c1e21", display: "flex", alignItems: "center",
      justifyContent: "center", fontWeight: 700, fontSize: depth > 0 ? 11 : 13,
    };

    return (
      <div key={c.id}>
        <div style={{ ...s.commentItem, marginLeft: depth * 28 }}>
          <div style={{ cursor: "pointer" }} onClick={() => navigate(`/users/${c.author.id}`)}>
            {c.author.avatar_url
              ? <img src={c.author.avatar_url} alt="" style={avatarStyle} />
              : <div style={avatarPlaceholderStyle}>{initials}</div>
            }
          </div>
          <div style={s.commentBody}>
            <div style={s.commentBubble}>
              <div style={s.commentAuthor} onClick={() => navigate(`/users/${c.author.id}`)}>
                {c.author.name}
                {c.author.username && (
                  <span style={{ fontWeight: 400, color: "#65676b", marginLeft: 6 }}>
                    @{c.author.username}
                  </span>
                )}
              </div>
              <div style={s.commentText}>{c.content}</div>
            </div>
            <div style={s.commentMeta}>
              <span style={s.commentDate}>{formatDate(c.created_at)}</span>
              {depth < 3 && (
                <button style={s.replyBtn} onClick={() => {
                  setReplyingTo(isReplying ? null : c.id);
                  setReplyText("");
                }}>
                  {isReplying ? "Cancel" : "Reply"}
                </button>
              )}
              {user?.id === c.author.id && (
                <button style={s.commentDeleteBtn} onClick={() => handleDeleteComment(c.id)}>
                  Delete
                </button>
              )}
            </div>

            {/* Inline reply input */}
            {isReplying && (
              <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div>
                  {user?.avatar_url
                    ? <img src={user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                    : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1877f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <textarea
                    autoFocus
                    style={s.replyTextarea}
                    placeholder={`Reply to ${c.author.name}…`}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value.slice(0, MAX_COMMENT))}
                  />
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
                    <button style={s.cancelBtn} onClick={() => { setReplyingTo(null); setReplyText(""); }}>
                      Cancel
                    </button>
                    <button
                      style={s.submitBtn(!replyText.trim() || replySubmitting)}
                      disabled={!replyText.trim() || replySubmitting}
                      onClick={() => handleSubmitReply(c.id)}
                    >
                      {replySubmitting ? "Posting…" : "Reply"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Render nested replies */}
        {c._replies && c._replies.map(r => renderComment(r, depth + 1))}
      </div>
    );
  };

  if (pageLoading) return <div style={s.loading}>Loading...</div>;
  if (!post) return null;

  const postInitials = post.author.name.charAt(0).toUpperCase();
  const myInitials = user?.name?.charAt(0).toUpperCase() ?? "?";
  const canComment = commentText.trim().length > 0 && !submitting;
  const tree = buildTree(comments);
  const topLevelCount = comments.filter(c => !c.parent_comment_id).length;

  return (
    <div style={s.page}>
      <button style={s.backBtn} onClick={() => navigate(-1)}>
        ← Back
      </button>

      {/* ── Post card ── */}
      <div style={s.card}>
        <div style={s.header}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
            onClick={() => navigate(`/users/${post.author.id}`)}
          >
            {post.author.avatar_url
              ? <img src={post.author.avatar_url} alt="" style={s.avatar} />
              : <div style={s.avatarPlaceholder}>{postInitials}</div>
            }
            <div>
              <div style={s.authorName}>{post.author.name}</div>
              {post.author.username && (
                <div style={s.authorUsername}>@{post.author.username}</div>
              )}
            </div>
          </div>
          <div style={s.date}>{formatDate(post.created_at)}</div>
        </div>

        {post.title && <div style={s.title}>{post.title}</div>}

        {post.content && post.content.trim() && (
          <p style={s.content}>{post.content}</p>
        )}

        {post.link_url && (
          <a href={post.link_url} target="_blank" rel="noopener noreferrer" style={s.linkBox}>
            🔗 {post.link_url}
          </a>
        )}

        {post.media_url && post.media_type === "image" && (
          <img src={post.media_url} alt="" style={s.media} />
        )}
        {post.media_url && post.media_type === "video" && (
          <video src={post.media_url} style={s.media} controls />
        )}

        <div style={s.actions}>
          <button style={s.likeBtn(post.liked_by_me)} onClick={handleLike} disabled={likeLoading}>
            {post.liked_by_me ? "♥" : "♡"} {post.like_count} {post.like_count === 1 ? "Like" : "Likes"}
          </button>
          <span style={{ fontSize: 14, color: "#65676b" }}>
            💬 {post.comment_count} {post.comment_count === 1 ? "Comment" : "Comments"}
          </span>
          {user?.id === post.author.id && (
            <button style={s.deletePostBtn} onClick={handleDeletePost}>Delete post</button>
          )}
        </div>
      </div>

      {/* ── Comments card ── */}
      <div style={s.commentsCard}>
        <div style={s.commentsHeading}>
          Comments ({post.comment_count})
        </div>

        {/* Top-level comment input */}
        <form onSubmit={handleSubmitComment}>
          <div style={s.inputRow}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" style={s.inputAvatar} />
              : <div style={s.inputAvatarPlaceholder}>{myInitials}</div>
            }
            <div style={s.inputWrap}>
              <textarea
                ref={textareaRef}
                style={s.textarea}
                placeholder="Write a comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value.slice(0, MAX_COMMENT))}
              />
              <div style={s.inputFooter}>
                <span style={s.charCount}>{commentText.length}/{MAX_COMMENT}</span>
                <button type="submit" style={s.submitBtn(!canComment)} disabled={!canComment}>
                  {submitting ? "Posting…" : "Post"}
                </button>
              </div>
              {commentError && <div style={s.commentError}>{commentError}</div>}
            </div>
          </div>
        </form>

        {tree.length > 0 && <div style={s.divider} />}

        {tree.length === 0
          ? <div style={s.noComments}>No comments yet — be the first!</div>
          : tree.map(c => renderComment(c, 0))
        }
      </div>
    </div>
  );
}
