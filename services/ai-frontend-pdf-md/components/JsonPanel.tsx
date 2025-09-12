"use client";
import { useMemo, useState } from 'react';
import { buildQADocumentJson } from '@/lib/qa';

export default function JsonPanel({ content, title }: { content: string; title: string }) {
  const data = useMemo(() => buildQADocumentJson(content, title), [content, title]);
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
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 p-2 flex items-center justify-between">
        <div className="text-sm font-medium">Extracted JSON</div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500 hidden md:block">
            {counts.total} questions{counts.byCat.length > 0 && ' · '}
            {counts.byCat.map((x) => `${x.cat}: ${x.count}`).join(' · ')}
          </div>
          <button
            type="button"
            onClick={copy}
            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >{copied ? 'Copied' : 'Copy'}</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="text-xs md:text-sm p-3 whitespace-pre overflow-auto select-text">{pretty}</pre>
      </div>
    </div>
  );
}

