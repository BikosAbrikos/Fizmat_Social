import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";

const TABS = [
  { path: "/",              icon: "🏠", label: "Feed" },
  { path: "/communities",   icon: "🏘️", label: "Groups" },
  { path: "/saved",         icon: "🔖", label: "Saved" },
  { path: "/submit",        icon: "✏️", label: "Post" },
  { path: "/chats",         icon: "💬", label: "Chats" },
  { path: "/notifications", icon: "🔔", label: "Alerts" },
  { path: "/profile",       icon: "👤", label: "Profile" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, isDark } = useTheme();
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

  if (isMobile) {
    return (
      <>
        <nav style={{
          background: theme.nav,
          borderBottom: `1px solid ${theme.navBorder}`,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 48,
          position: "sticky",
          top: 0,
          zIndex: 200,
        }}>
          <Link to="/" style={{ color: theme.accent, fontWeight: 900, fontSize: 17, textDecoration: "none", letterSpacing: -0.5 }}>
            FizMat Social
          </Link>
          {user && (
            <button
              onClick={handleLogout}
              style={{
                background: "none",
                border: `1px solid ${theme.border}`,
                color: theme.textSub,
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
                fontWeight: 600,
              }}
            >
              Logout
            </button>
          )}
        </nav>

        {user && (
          <div style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 300,
            background: theme.nav,
            borderTop: `1px solid ${theme.navBorder}`,
            display: "flex",
            alignItems: "stretch",
            height: "calc(56px + env(safe-area-inset-bottom, 0px))",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}>
            {TABS.map(tab => {
              const active = tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
              const showBadge = tab.path === "/notifications" && notifCount > 0;
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    border: "none",
                    background: "none",
                    color: active ? theme.accent : theme.textSub,
                    fontSize: 10,
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    paddingTop: 4,
                    borderTop: active ? `2px solid ${theme.accent}` : "2px solid transparent",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
                    {showBadge && (
                      <span style={{
                        position: "absolute",
                        top: -4,
                        right: -8,
                        background: theme.danger,
                        color: "#fff",
                        borderRadius: "50%",
                        fontSize: 9,
                        fontWeight: 700,
                        minWidth: 15,
                        height: 15,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 3px",
                      }}>
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

  // Desktop
  return (
    <nav style={{
      background: theme.nav,
      borderBottom: `1px solid ${theme.navBorder}`,
      padding: "0 20px",
      display: "flex",
      alignItems: "center",
      height: 48,
      position: "sticky",
      top: 0,
      zIndex: 200,
      gap: 8,
    }}>
      <Link to="/" style={{ color: theme.accent, fontWeight: 900, fontSize: 18, textDecoration: "none", marginRight: 16, letterSpacing: -0.5, whiteSpace: "nowrap" }}>
        FizMat Social
      </Link>

      {user && (
        <>
          {[
            { to: "/", label: "Feed" },
            { to: "/communities", label: "Communities" },
            { to: "/saved", label: "Saved" },
            { to: "/chats", label: "Chats" },
          ].map(({ to, label }) => {
            const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                style={{
                  color: active ? theme.accent : theme.textSub,
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  textDecoration: "none",
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: active ? (isDark ? "rgba(255,69,0,0.12)" : "rgba(255,69,0,0.08)") : "none",
                }}
              >
                {label}
              </Link>
            );
          })}

          <div style={{ position: "relative" }}>
            <Link
              to="/notifications"
              style={{
                color: location.pathname.startsWith("/notifications") ? theme.accent : theme.textSub,
                fontWeight: location.pathname.startsWith("/notifications") ? 700 : 500,
                fontSize: 14,
                textDecoration: "none",
                padding: "4px 10px",
                borderRadius: 20,
                background: location.pathname.startsWith("/notifications") ? (isDark ? "rgba(255,69,0,0.12)" : "rgba(255,69,0,0.08)") : "none",
              }}
            >
              Notifications
            </Link>
            {notifCount > 0 && (
              <span style={{
                position: "absolute",
                top: -2,
                right: 2,
                background: theme.danger,
                color: "#fff",
                borderRadius: "50%",
                fontSize: 9,
                fontWeight: 700,
                minWidth: 15,
                height: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
              }}>
                {notifCount}
              </span>
            )}
          </div>
        </>
      )}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {user && (
          <>
            <Link
              to="/submit"
              style={{
                background: theme.accent,
                color: "#fff",
                border: "none",
                borderRadius: 20,
                padding: "6px 16px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              + Create Post
            </Link>
            <Link
              to="/profile"
              style={{
                color: theme.navText,
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
                padding: "4px 10px",
                borderRadius: 20,
                border: `1px solid ${theme.border}`,
                background: theme.cardHover,
                whiteSpace: "nowrap",
              }}
            >
              {user.name}
            </Link>
            <button
              onClick={handleLogout}
              style={{
                background: "none",
                border: `1px solid ${theme.border}`,
                color: theme.textSub,
                borderRadius: 20,
                padding: "5px 14px",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                fontWeight: 600,
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
