"use client";
import { useEffect, useMemo, useState } from "react";
import { buildQADocumentJson } from "@/lib/qa";

function resolveRelativePath(mdRelPath: string, imgPath: string): string {
  // Normalize to POSIX-like segments
  const mdSegs = mdRelPath.split("/");
  mdSegs.pop(); // remove filename
  const parts = imgPath.split("/");
  for (const seg of parts) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (mdSegs.length > 0) mdSegs.pop();
      continue;
    }
    mdSegs.push(seg);
  }
  return mdSegs.join("/");
}

type GenState = {
  loading: boolean;
  error?: string | null;
  mimeType?: string;
  dataUrl?: string; // data:mime;base64,...
};

export default function ImagesPanel({
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

  // Listen for global refresh from StatusPanel and our own save handler
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

  const data = useMemo(() => buildQADocumentJson(currentContent, title), [currentContent, title]);
  const root = (data as any)[title] || {} as Record<string, Record<string, any>>;

  const items = useMemo(() => {
    const out: { id: string; cat: string; key: string; rel: string; srcRef: string }[] = [];
    for (const cat of Object.keys(root)) {
      const entries = root[cat] || {};
      for (const key of Object.keys(entries)) {
        const q = entries[key] || {};
        const imgs: string[] = Array.isArray(q.Imagenes) ? q.Imagenes : [];
        for (let i = 0; i < imgs.length; i++) {
          const srcRef = imgs[i];
          const rel = resolveRelativePath(mdRelPath, srcRef);
          out.push({ id: `${cat}/${key}/${i}`, cat, key, rel, srcRef });
        }
      }
    }
    return out;
  }, [root, mdRelPath]);

  const [gen, setGen] = useState<Record<string, GenState>>({});

  const generate = async (id: string, rel: string) => {
    setGen((m) => ({ ...m, [id]: { loading: true } }));
    try {
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: rel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Generation failed");
      const mime = data?.mimeType || "image/png";
      const b64 = data?.data;
      const dataUrl = b64 ? `data:${mime};base64,${b64}` : undefined;
      setGen((m) => ({ ...m, [id]: { loading: false, mimeType: mime, dataUrl } }));
    } catch (e: any) {
      setGen((m) => ({ ...m, [id]: { loading: false, error: e?.message || "Error" } }));
    }
  };

  const saveGenerated = async (id: string, rel: string, srcRef: string) => {
    const s = gen[id];
    if (!s?.dataUrl) return;
    const b64 = s.dataUrl.split(',')[1] || '';
    setGen((m) => ({ ...m, [id]: { ...(m[id] || {}), loading: true, error: null } }));
    try {
      const res = await fetch('/api/gemini/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: rel, mdPath: mdRelPath, srcRef, data: b64, mimeType: s.mimeType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save');
      setGen((m) => ({ ...m, [id]: { ...(m[id] || {}), loading: false } }));
      try { window.dispatchEvent(new CustomEvent('doc:refresh-json', { detail: { mdRelPath } })); } catch {}
    } catch (e: any) {
      setGen((m) => ({ ...m, [id]: { ...(m[id] || {}), loading: false, error: e?.message || 'Failed to save' } }));
    }
  };

  if (items.length === 0) {
    return (
      <div className="h-full overflow-auto p-3 text-sm text-gray-500">
        No images found in the extracted JSON (key "Imagenes").
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-2 space-y-3">
      {items.map(({ id, cat, key, rel, srcRef }) => {
        const origUrl = `/api/file?path=${encodeURIComponent(rel)}`;
        const s = gen[id] || { loading: false };
        return (
          <div key={id} className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
            <div className="px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
              <div className="truncate">
                <span className="font-medium">{cat}</span>
                <span className="mx-1">·</span>
                <span>Q {key}</span>
                <span className="mx-1">·</span>
                <code className="text-gray-600 dark:text-gray-300">{rel}</code>
              </div>
              <div className="flex items-center gap-2">
                {s.error && <span className="text-red-600">{s.error}</span>}
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  onClick={() => generate(id, rel)}
                  disabled={s.loading}
                >{s.loading ? 'Generating…' : 'Generate'}</button>
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  onClick={() => saveGenerated(id, rel, srcRef)}
                  disabled={s.loading || !s.dataUrl}
                >Save</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-2">
                <div className="text-xs text-gray-500 mb-1">Original</div>
                <div className="border rounded bg-white dark:bg-gray-900 overflow-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={origUrl} alt={`Original ${rel}`} className="max-h-96 object-contain mx-auto" />
                </div>
              </div>
              <div className="p-2">
                <div className="text-xs text-gray-500 mb-1">Gemini</div>
                <div className="border rounded bg-white dark:bg-gray-900 overflow-auto min-h-[6rem] flex items-center justify-center">
                  {s.dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.dataUrl} alt={`Gemini for ${rel}`} className="max-h-96 object-contain mx-auto" />
                  ) : s.loading ? (
                    <div className="text-xs text-gray-500">Generating…</div>
                  ) : (
                    <div className="text-xs text-gray-500">No image yet. Click Generate.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
