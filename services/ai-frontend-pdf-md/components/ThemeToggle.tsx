"use client";
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setMounted(true);
    const initial = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
    setDark(initial);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [dark, mounted]);
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setDark((d) => !d)}
      className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      {dark ? 'Dark' : 'Light'}
    </button>
  );
}

