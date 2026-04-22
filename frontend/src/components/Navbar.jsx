import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const s = {
  nav: { background: "#1877f2", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 },
  brand: { color: "#fff", fontWeight: 700, fontSize: 20, textDecoration: "none" },
  links: { display: "flex", gap: 16, alignItems: "center" },
  link: { color: "#fff", textDecoration: "none", fontSize: 14 },
  btn: { background: "#fff", color: "#1877f2", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontWeight: 600, fontSize: 14 },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav style={s.nav}>
      <Link to="/" style={s.brand}>FizMat Social</Link>
      {user && (
        <div style={s.links}>
          <Link to="/" style={s.link}>Feed</Link>
          <Link to="/profile" style={s.link}>{user.name}</Link>
          <button style={s.btn} onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
}
