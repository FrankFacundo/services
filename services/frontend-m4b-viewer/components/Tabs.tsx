"use client";
import { useState } from "react";

export default function Tabs({ tabs }: { tabs: { id: string; title: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) || tabs[0];
  return (
    <div>
      <div className="border-b mb-3 flex gap-2 dark:border-gray-700">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActive(t.id)} className={`px-3 py-1 border-b-2 -mb-[1px] ${active === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'}`}>{t.title}</button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
