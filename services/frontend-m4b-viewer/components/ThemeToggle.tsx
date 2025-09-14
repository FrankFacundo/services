"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return getSystemPrefersDark() ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  // Initialize theme on mount
  useEffect(() => {
    const t = getInitialTheme();
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <button
      aria-label="Toggle dark mode"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      onClick={toggle}
      className="px-2 py-1 rounded border text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:border-gray-600"
    >
      {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}

