"use client";
import { useMemo, useState } from "react";
import { buildQADocumentJson } from "@/lib/qa";

export default function JsonPanel({
  content,
  title,
}: {
  content: string;
  title: string;
}) {
  const data = useMemo(
    () => buildQADocumentJson(content, title),
    [content, title]
  );
  const pretty = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pretty);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  // Basic counts for a quick glance
  const counts = useMemo(() => {
    const root = data[title] || {};
    let total = 0;
    const byCat: { cat: string; count: number }[] = [];
    for (const cat of Object.keys(root)) {
      const c = Object.keys(root[cat] || {}).length;
      if (c > 0) byCat.push({ cat, count: c });
      total += c;
    }
    return { total, byCat };
  }, [data, title]);

  return (
    <div className="h-full overflow-auto flex flex-col">
      <div className="flex-1 overflow-auto">
        <pre className="text-xs md:text-sm p-3 whitespace-pre overflow-auto select-text">
          {pretty}
        </pre>
      </div>
    </div>
  );
}
