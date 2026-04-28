import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Login() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const input = {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: 4,
    fontSize: 14,
    background: theme.input,
    color: theme.text,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: theme.accent, textAlign: "center", marginBottom: 24, letterSpacing: -0.5 }}>
          FizMat Social
        </h1>

        <div style={{
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: 4,
          padding: 24,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 20, textAlign: "center" }}>Log In</h2>

          {error && (
            <div style={{ background: "rgba(255,88,91,0.1)", border: `1px solid ${theme.danger}`, borderRadius: 4, padding: "10px 12px", color: theme.danger, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                Email
              </label>
              <input
                style={input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@fizmat.kz"
                autoFocus
                onFocus={e => e.currentTarget.style.borderColor = theme.accent}
                onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.textSub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                Password
              </label>
              <input
                style={input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••"
                onFocus={e => e.currentTarget.style.borderColor = theme.accent}
                onBlur={e => e.currentTarget.style.borderColor = theme.inputBorder}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px 0",
                background: theme.accent,
                color: "#fff",
                border: "none",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                fontFamily: "inherit",
              }}
            >
              {loading ? "Logging in…" : "Log In"}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: theme.textSub }}>
            No account?{" "}
            <Link to="/register" style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}>
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
