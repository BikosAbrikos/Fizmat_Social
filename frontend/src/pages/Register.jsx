import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";

const s = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  box: { background: "#fff", borderRadius: 8, padding: 32, width: 400, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: "center" },
  subtitle: { fontSize: 13, color: "#65676b", marginBottom: 24, textAlign: "center" },
  field: { marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #ccd0d5", borderRadius: 6, fontSize: 14, boxSizing: "border-box" },
  hint: { fontSize: 12, color: "#65676b", marginTop: 3 },
  btn: { width: "100%", padding: 11, background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  error: { color: "#e41749", fontSize: 13, marginBottom: 10 },
  success: { color: "#42b72a", fontSize: 13, marginBottom: 10 },
  footer: { marginTop: 18, textAlign: "center", fontSize: 13 },
  preview: { fontSize: 13, color: "#1877f2", marginTop: 6, fontStyle: "italic" },
  step: { fontSize: 12, color: "#65676b", marginBottom: 16, textAlign: "center" },
};

function parseEmail(email) {
  const local = email.split("@")[0];
  const parts = local.split(".");
  const name = parts
    .map((p) => p.replace(/\d+$/, ""))
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
  return { name, username: local };
}

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  // Step 2
  const [form, setForm] = useState({ name: "", username: "", password: "", confirmPassword: "", code: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const emailPreview = email.endsWith("@fizmat.kz") ? parseEmail(email) : null;

  const handleSendCode = async (e) => {
    e.preventDefault();
    setSendError("");
    setSendSuccess("");
    if (!email.endsWith("@fizmat.kz")) {
      setSendError("Only @fizmat.kz emails are allowed");
      return;
    }
    setSending(true);
    try {
      await api.post("/api/auth/send-verification", { email });
      const parsed = parseEmail(email);
      setForm({ name: parsed.name, username: parsed.username, password: "", confirmPassword: "", code: "" });
      setSendSuccess("Code sent! Check your inbox.");
      setStep(2);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setSendError(Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : detail || "Failed to send code");
    } finally {
      setSending(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (form.password !== form.confirmPassword) {
      setSubmitError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/auth/register", {
        email,
        code: form.code,
        name: form.name,
        username: form.username,
        password: form.password,
        confirm_password: form.confirmPassword,
      });
      navigate("/login");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setSubmitError(Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : detail || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <div style={s.page}>
        <div style={s.box}>
          <h1 style={s.title}>Create Account</h1>
          <p style={s.subtitle}>Only @fizmat.kz emails can register</p>
          <form onSubmit={handleSendCode}>
            {sendError && <div style={s.error}>{sendError}</div>}
            {sendSuccess && <div style={s.success}>{sendSuccess}</div>}
            <div style={s.field}>
              <label style={s.label}>FizMat Email</label>
              <input
                style={s.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                required
                placeholder="you@fizmat.kz"
                autoFocus
              />
              {emailPreview && (
                <div style={s.preview}>
                  Will register as: {emailPreview.name} (@{emailPreview.username})
                </div>
              )}
            </div>
            <button style={{ ...s.btn, ...(sending ? s.btnDisabled : {}) }} type="submit" disabled={sending}>
              {sending ? "Sending..." : "Send Verification Code"}
            </button>
          </form>
          <div style={s.footer}>
            Already have an account? <Link to="/login">Log in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.box}>
        <h1 style={s.title}>Create Account</h1>
        <p style={s.step}>Step 2 of 2 — A 6-digit code was sent to {email}</p>
        <form onSubmit={handleRegister}>
          {submitError && <div style={s.error}>{submitError}</div>}

          <div style={s.field}>
            <label style={s.label}>Verification Code</label>
            <input
              style={s.input}
              type="text"
              value={form.code}
              onChange={set("code")}
              required
              placeholder="6-digit code from your email"
              maxLength={6}
              autoFocus
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Full Name</label>
            <input
              style={s.input}
              type="text"
              value={form.name}
              onChange={set("name")}
              required
              placeholder="Your full name"
            />
            <div style={s.hint}>Auto-filled from your email. You can edit it.</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Username</label>
            <input
              style={s.input}
              type="text"
              value={form.username}
              onChange={set("username")}
              required
              placeholder="username"
            />
            <div style={s.hint}>Visible on your posts. Letters, numbers, dots, underscores only.</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              value={form.password}
              onChange={set("password")}
              required
              placeholder="Min. 6 characters"
              minLength={6}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Confirm Password</label>
            <input
              style={s.input}
              type="password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              required
              placeholder="Repeat your password"
            />
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <div style={{ ...s.hint, color: "#e41749" }}>Passwords do not match</div>
            )}
          </div>

          <button style={{ ...s.btn, ...(submitting ? s.btnDisabled : {}) }} type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <div style={s.footer}>
          <button
            style={{ background: "none", border: "none", color: "#1877f2", cursor: "pointer", fontSize: 13 }}
            onClick={() => { setStep(1); setSendError(""); setSendSuccess(""); }}
          >
            ← Use a different email
          </button>
        </div>
      </div>
    </div>
  );
}
