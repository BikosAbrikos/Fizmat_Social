import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const s = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  box: { background: "#fff", borderRadius: 8, padding: 32, width: 380, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 24, textAlign: "center" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 14, fontWeight: 600, marginBottom: 4 },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #ccd0d5", borderRadius: 6, fontSize: 15 },
  btn: { width: "100%", padding: 12, background: "#1877f2", color: "#fff", border: "none", borderRadius: 6, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8 },
  error: { color: "#e41749", fontSize: 14, marginBottom: 12 },
  footer: { marginTop: 20, textAlign: "center", fontSize: 14 },
};

export default function Login() {
  const { login } = useAuth();
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

  return (
    <div style={s.page}>
      <div style={s.box}>
        <h1 style={s.title}>FizMat Social</h1>
        <form onSubmit={handleSubmit}>
          {error && <div style={s.error}>{error}</div>}
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@fizmat.kz" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••" />
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        <div style={s.footer}>
          No account? <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}
