import { createContext, useContext, useState } from "react";

export const LIGHT = {
  bg: "#dae0e6",
  card: "#ffffff",
  cardHover: "#f8f9fa",
  border: "#edeff1",
  accent: "#ff4500",
  accentHover: "#e03d00",
  text: "#1c1c1c",
  textSub: "#878a8c",
  input: "#f6f7f8",
  inputBorder: "#edeff1",
  nav: "#ffffff",
  navBorder: "#edeff1",
  navText: "#1c1c1c",
  upvote: "#ff4500",
  link: "#0079d3",
  success: "#46d160",
  danger: "#ff585b",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
  shadowMd: "0 2px 8px rgba(0,0,0,0.12)",
};

export const DARK = {
  bg: "#1a1a1b",
  card: "#272729",
  cardHover: "#2d2d2f",
  border: "#343536",
  accent: "#ff4500",
  accentHover: "#e03d00",
  text: "#d7dadc",
  textSub: "#818384",
  input: "#1a1a1b",
  inputBorder: "#343536",
  nav: "#1a1a1b",
  navBorder: "#343536",
  navText: "#d7dadc",
  upvote: "#ff4500",
  link: "#4fbdff",
  success: "#46d160",
  danger: "#ff585b",
  shadow: "0 1px 3px rgba(0,0,0,0.3)",
  shadowMd: "0 2px 8px rgba(0,0,0,0.4)",
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");
  const theme = isDark ? DARK : LIGHT;

  const toggleTheme = () =>
    setIsDark(d => {
      const next = !d;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, transition: "background 0.2s, color 0.2s" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
