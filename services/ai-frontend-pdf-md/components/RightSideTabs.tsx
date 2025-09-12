"use client";
import { useState } from "react";
import JsonPanel from "@/components/JsonPanel";
import ImagesPanel from "@/components/ImagesPanel";

export default function RightSideTabs({
  content,
  title,
  mdRelPath,
}: {
  content: string;
  title: string;
  mdRelPath: string;
}) {
  const [tab, setTab] = useState<"json" | "images">("json");
  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 p-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("json")}
          className={`px-2 py-1 text-xs rounded border ${tab === 'json' ? 'border-blue-500 text-blue-600 dark:text-blue-300' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          aria-pressed={tab === 'json'}
        >JSON</button>
        <button
          type="button"
          onClick={() => setTab("images")}
          className={`px-2 py-1 text-xs rounded border ${tab === 'images' ? 'border-blue-500 text-blue-600 dark:text-blue-300' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          aria-pressed={tab === 'images'}
        >Images</button>
      </div>
      <div className="flex-1 overflow-auto">
        {tab === "json" ? (
          <JsonPanel content={content} title={title} mdRelPath={mdRelPath} />
        ) : (
          <ImagesPanel content={content} title={title} mdRelPath={mdRelPath} />
        )}
      </div>
    </div>
  );
}

