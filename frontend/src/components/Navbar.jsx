import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const s = {
  nav: { background: "#1877f2", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 },
  brand: { color: "#fff", fontWeight: 700, fontSize: 20, textDecoration: "none" },
  links: { display: "flex", gap: 16, alignItems: "center" },
  link: { color: "#fff", textDecoration: "none", fontSize: 14 },
  btn: { background: "#fff", color: "#1877f2", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontWeight: 600, fontSize: 14 },
  notifWrap: { position: "relative", display: "inline-flex", alignItems: "center" },
  badge: { position: "absolute", top: -6, right: -8, background: "#e41749", color: "#fff", borderRadius: "50%", fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.get("/api/friends/requests/incoming/count")
      .then(({ data }) => setNotifCount(data.count))
      .catch(() => {});
  }, [user, location.pathname]);

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
          <Link to="/chats" style={s.link}>Chats</Link>
          <div style={s.notifWrap}>
            <Link to="/notifications" style={s.link}>Notifications</Link>
            {notifCount > 0 && <span style={s.badge}>{notifCount}</span>}
          </div>
          <Link to="/profile" style={s.link}>{user.name}</Link>
          <button style={s.btn} onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
}
