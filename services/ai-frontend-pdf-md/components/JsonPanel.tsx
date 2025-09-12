"use client";
import { useEffect, useMemo, useState } from "react";
import { buildQADocumentJson } from "@/lib/qa";

export default function JsonPanel({
  content,
  title,
  mdRelPath,
}: {
  content: string;
  title: string;
  mdRelPath: string;
}) {
  const [currentContent, setCurrentContent] = useState(content);

  useEffect(() => { setCurrentContent(content); }, [content]);

  useEffect(() => {
    // Register our mdRelPath so StatusPanel can discover it without extra props
    try {
      window.dispatchEvent(new CustomEvent('doc:register-json', { detail: { mdRelPath, title } }));
    } catch {}
  }, [mdRelPath, title]);

  useEffect(() => {
    const handler = async (e: Event) => {
      const ev = e as CustomEvent<{ mdRelPath?: string }>;
      if (ev.detail?.mdRelPath && ev.detail.mdRelPath !== mdRelPath) return;
      try {
        const res = await fetch(`/api/file?path=${encodeURIComponent(mdRelPath)}`, { cache: 'no-store' });
        const text = await res.text();
        setCurrentContent(text);
      } catch {}
    };
    window.addEventListener('doc:refresh-json' as any, handler as any);
    return () => window.removeEventListener('doc:refresh-json' as any, handler as any);
  }, [mdRelPath]);

  const data = useMemo(
    () => buildQADocumentJson(currentContent, title),
    [currentContent, title]
  );
  const pretty = useMemo(() => JSON.stringify(data, null, 2), [data]);

  return (
    <div className="h-full overflow-auto flex flex-col">
      <div className="flex-1 overflow-auto">
        <pre className="text-xs md:text-sm p-3 whitespace-pre overflow-auto select-text">{pretty}</pre>
      </div>
    </div>
  );
}
