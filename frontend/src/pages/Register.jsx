import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useTheme } from "../context/ThemeContext";

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
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  const [form, setForm] = useState({ name: "", username: "", password: "", confirmPassword: "", code: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const emailPreview = email.endsWith("@fizmat.kz") ? parseEmail(email) : null;

  const handleSendCode = async (e) => {
    e.preventDefault();
    setSendError(""); setSendSuccess("");
    if (!email.endsWith("@fizmat.kz")) { setSendError("Only @fizmat.kz emails are allowed"); return; }
    setSending(true);
    try {
      await api.post("/api/auth/send-verification", { email });
      const parsed = parseEmail(email);
      setForm({ name: parsed.name, username: parsed.username, password: "", confirmPassword: "", code: "" });
      setSendSuccess("Code sent! Check your inbox.");
      setStep(2);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setSendError(
        Array.isArray(detail)
          ? detail.map((d) => d.msg).join(", ")
          : detail || (err.code === "ECONNABORTED" ? "Request timed out. Please try again." : "Failed to send code. Please try again.")
      );
    } finally {
      setSending(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (form.password !== form.confirmPassword) { setSubmitError("Passwords do not match"); return; }
    setSubmitting(true);
    try {
      await api.post("/api/auth/register", {
        email, code: form.code, name: form.name, username: form.username,
        password: form.password, confirm_password: form.confirmPassword,
      });
      navigate("/login");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setSubmitError(Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : detail || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const input = {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: 4,
    fontSize: 14,
    background: theme.input,
    color: theme.text,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
  };

  const label = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: theme.textSub,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  };

  const card = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 4,
    padding: 24,
  };

  if (step === 1) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: theme.accent, textAlign: "center", marginBottom: 24, letterSpacing: -0.5 }}>
            FizMat Social
          </h1>
          <div style={card}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 4, textAlign: "center" }}>Create Account</h2>
            <p style={{ fontSize: 13, color: theme.textSub, textAlign: "center", marginBottom: 20 }}>Only @fizmat.kz emails can register</p>

            {sendError && (
              <div style={{ background: "rgba(255,88,91,0.1)", border: `1px solid ${theme.danger}`, borderRadius: 4, padding: "8px 12px", color: theme.danger, fontSize: 13, marginBottom: 14 }}>
                {sendError}
              </div>
            )}

            <form onSubmit={handleSendCode}>
              <div style={{ marginBottom: 16 }}>
                <label style={label}>FizMat Email</label>
                <input
                  style={input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  required
                  placeholder="you@fizmat.kz"
                  autoFocus
                  onFocus={e => e.currentTarget.style.borderColor = theme.accent}
                  onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
                />
                {emailPreview && (
                  <div style={{ fontSize: 12, color: theme.link, marginTop: 4 }}>
                    Will register as: {emailPreview.name} (@{emailPreview.username})
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={sending}
                style={{
                  width: "100%", padding: "10px 0", background: theme.accent, color: "#fff",
                  border: "none", borderRadius: 20, fontSize: 14, fontWeight: 700,
                  cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1, fontFamily: "inherit",
                }}
              >
                {sending ? "Sending…" : "Send Verification Code"}
              </button>
            </form>

            <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: theme.textSub }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}>Log in</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: theme.accent, textAlign: "center", marginBottom: 24, letterSpacing: -0.5 }}>
          FizMat Social
        </h1>
        <div style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 4, textAlign: "center" }}>Create Account</h2>
          <p style={{ fontSize: 12, color: theme.textSub, textAlign: "center", marginBottom: 16 }}>
            Step 2 of 2 — A code was sent to {email}
          </p>

          {submitError && (
            <div style={{ background: "rgba(255,88,91,0.1)", border: `1px solid ${theme.danger}`, borderRadius: 4, padding: "8px 12px", color: theme.danger, fontSize: 13, marginBottom: 14 }}>
              {submitError}
            </div>
          )}

          <form onSubmit={handleRegister}>
            {[
              { field: "code", lbl: "Verification Code", type: "text", ph: "6-digit code from email", maxLen: 6 },
              { field: "name", lbl: "Full Name", type: "text", ph: "Your full name", hint: "Auto-filled from email. You can edit." },
              { field: "username", lbl: "Username", type: "text", ph: "username", hint: "Letters, numbers, dots, underscores only." },
              { field: "password", lbl: "Password", type: "password", ph: "Min. 6 characters", minLen: 6 },
              { field: "confirmPassword", lbl: "Confirm Password", type: "password", ph: "Repeat password" },
            ].map(({ field, lbl, type, ph, hint, maxLen, minLen }) => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={label}>{lbl}</label>
                <input
                  style={input}
                  type={type}
                  value={form[field]}
                  onChange={set(field)}
                  required
                  placeholder={ph}
                  maxLength={maxLen}
                  minLength={minLen}
                  autoFocus={field === "code"}
                  onFocus={e => e.currentTarget.style.borderColor = theme.accent}
                  onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
                />
                {hint && <div style={{ fontSize: 12, color: theme.textSub, marginTop: 3 }}>{hint}</div>}
                {field === "confirmPassword" && form.confirmPassword && form.password !== form.confirmPassword && (
                  <div style={{ fontSize: 12, color: theme.danger, marginTop: 3 }}>Passwords do not match</div>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%", padding: "10px 0", background: theme.accent, color: "#fff",
                border: "none", borderRadius: 20, fontSize: 14, fontWeight: 700, marginTop: 4,
                cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, fontFamily: "inherit",
              }}
            >
              {submitting ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div style={{ marginTop: 14, textAlign: "center" }}>
            <button
              style={{ background: "none", border: "none", color: theme.link, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
              onClick={() => { setStep(1); setSendError(""); setSendSuccess(""); }}
            >
              ← Use a different email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
