import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";

const s = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  box: { background: "#fff", borderRadius: 8, padding: 32, width: 380, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 4, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#65676b", marginBottom: 24, textAlign: "center" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 14, fontWeight: 600, marginBottom: 4 },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #ccd0d5", borderRadius: 6, fontSize: 15 },
  btn: { width: "100%", padding: 12, background: "#42b72a", color: "#fff", border: "none", borderRadius: 6, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8 },
  error: { color: "#e41749", fontSize: 14, marginBottom: 12 },
  footer: { marginTop: 20, textAlign: "center", fontSize: 14 },
};

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email.endsWith("@fizmat.kz")) {
      setError("Only @fizmat.kz emails are allowed");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/register", form);
      navigate("/login");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join(", "));
      } else {
        setError(detail || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.box}>
        <h1 style={s.title}>Create Account</h1>
        <p style={s.subtitle}>Only @fizmat.kz emails can register</p>
        <form onSubmit={handleSubmit}>
          {error && <div style={s.error}>{error}</div>}
          <div style={s.field}>
            <label style={s.label}>Full Name</label>
            <input style={s.input} type="text" value={form.name} onChange={set("name")} required placeholder="Your name" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={form.email} onChange={set("email")} required placeholder="you@fizmat.kz" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={form.password} onChange={set("password")} required placeholder="Min. 6 characters" minLength={6} />
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>
        <div style={s.footer}>
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
