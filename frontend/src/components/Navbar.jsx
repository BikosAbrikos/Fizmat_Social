import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";

// ── Desktop top nav ────────────────────────────────────────────────────────
const ds = {
  nav: { background: "#1877f2", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 },
  brand: { color: "#fff", fontWeight: 700, fontSize: 20, textDecoration: "none" },
  links: { display: "flex", gap: 16, alignItems: "center" },
  link: { color: "#fff", textDecoration: "none", fontSize: 14 },
  btn: { background: "#fff", color: "#1877f2", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontWeight: 600, fontSize: 14 },
  notifWrap: { position: "relative", display: "inline-flex", alignItems: "center" },
  badge: { position: "absolute", top: -6, right: -8, background: "#e41749", color: "#fff", borderRadius: "50%", fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" },
};

// ── Mobile ─────────────────────────────────────────────────────────────────
const ms = {
  // Simplified top bar — brand + logout only
  topBar: { background: "#1877f2", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 200 },
  topBrand: { color: "#fff", fontWeight: 700, fontSize: 18, textDecoration: "none" },
  topLogout: { background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" },

  // Fixed bottom tab bar
  bottomBar: {
    position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
    background: "#fff", borderTop: "1px solid #e4e6eb",
    display: "flex", alignItems: "stretch",
    height: "calc(60px + env(safe-area-inset-bottom, 0px))",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  },
  tab: (active) => ({
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 2, textDecoration: "none",
    color: active ? "#1877f2" : "#65676b",
    fontSize: 10, fontWeight: active ? 700 : 500,
    cursor: "pointer", border: "none", background: "none", fontFamily: "inherit",
    paddingTop: 6,
  }),
  tabIcon: { fontSize: 22, lineHeight: 1 },
  tabBadgeWrap: { position: "relative" },
  tabBadge: {
    position: "absolute", top: -4, right: -8,
    background: "#e41749", color: "#fff", borderRadius: "50%",
    fontSize: 9, fontWeight: 700, minWidth: 15, height: 15,
    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
  },
};

const TABS = [
  { path: "/",             icon: "🏠", label: "Feed" },
  { path: "/submit",       icon: "✏️", label: "Post" },
  { path: "/chats",        icon: "💬", label: "Chats" },
  { path: "/notifications",icon: "🔔", label: "Alerts" },
  { path: "/profile",      icon: "👤", label: "Profile" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get("/api/friends/requests/incoming/count").catch(() => ({ data: { count: 0 } })),
      api.get("/api/chats/unread/count").catch(() => ({ data: { count: 0 } })),
    ]).then(([req, msg]) => {
      setNotifCount(req.data.count + msg.data.count);
    });
  }, [user, location.pathname]);

  const handleLogout = () => { logout(); navigate("/login"); };

  // ── Mobile layout ───────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Slim top bar — brand + logout */}
        <nav style={ms.topBar}>
          <Link to="/" style={ms.topBrand}>FizMat Social</Link>
          {user && (
            <button style={ms.topLogout} onClick={handleLogout}>Logout</button>
          )}
        </nav>

        {/* Bottom tab bar (only when logged in) */}
        {user && (
          <div style={ms.bottomBar}>
            {TABS.map(tab => {
              const active = tab.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(tab.path);
              const showBadge = tab.path === "/notifications" && notifCount > 0;

              return (
                <button
                  key={tab.path}
                  style={ms.tab(active)}
                  onClick={() => navigate(tab.path)}
                >
                  <div style={ms.tabBadgeWrap}>
                    <span style={ms.tabIcon}>{tab.icon}</span>
                    {showBadge && (
                      <span style={ms.tabBadge}>
                        {notifCount > 99 ? "99+" : notifCount}
                      </span>
                    )}
                  </div>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ── Desktop layout (unchanged) ──────────────────────────────────────────
  return (
    <nav style={ds.nav}>
      <Link to="/" style={ds.brand}>FizMat Social</Link>
      {user && (
        <div style={ds.links}>
          <Link to="/" style={ds.link}>Feed</Link>
          <Link to="/chats" style={ds.link}>Chats</Link>
          <div style={ds.notifWrap}>
            <Link to="/notifications" style={ds.link}>Notifications</Link>
            {notifCount > 0 && <span style={ds.badge}>{notifCount}</span>}
          </div>
          <Link to="/profile" style={ds.link}>{user.name}</Link>
          <button style={ds.btn} onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
}
