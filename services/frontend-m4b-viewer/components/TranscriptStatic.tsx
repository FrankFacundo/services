"use client";
import { useEffect, useState } from "react";

type Word = { word: string; start: number; end: number };
type Segment = { id?: number; start: number; end: number; text: string };

type Transcript = {
  text: string;
  words?: Word[];
  segments?: Segment[];
  start: number;
  end: number;
  chapterIndex: number;
};

export default function TranscriptStatic({ relPath, chapterIndex }: { relPath: string; chapterIndex: number }) {
  const [data, setData] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const r = await fetch(`/api/transcribe?path=${encodeURIComponent(relPath)}&chapter=${chapterIndex}`);
        if (!r.ok) {
          const msg = (() => { try { return (r as any).json?.(); } catch { return null; } })();
          throw new Error((await msg)?.error || `Transcript not found (${r.status})`);
        }
        const json = await r.json();
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load transcript");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [relPath, chapterIndex]);

  if (loading) return <div className="text-sm text-gray-600 dark:text-gray-300">Loading transcript…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!data) return <div className="text-sm text-gray-600 dark:text-gray-300">No transcript available.</div>;

  const segments = data.segments || [{ start: data.start, end: data.end, text: data.text }];

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600 dark:text-gray-300">
        Chapter {data.chapterIndex + 1} • {data.start.toFixed(2)}s – {data.end.toFixed(2)}s • {(data.end - data.start).toFixed(2)}s
      </div>
      <div className="space-y-3">
        {segments.map((s, i) => (
          <div key={i} className="rounded border p-2 dark:border-gray-700">
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">{s.start.toFixed(2)}s – {s.end.toFixed(2)}s</div>
            <div className="whitespace-pre-wrap leading-relaxed">{s.text}</div>
          </div>
        ))}
      </div>
      {data.words && data.words.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm">Word timestamps</summary>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {data.words.map((w, i) => (
              <div key={i} className="rounded border p-1 dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-300">{w.start.toFixed(2)}s – {w.end.toFixed(2)}s</div>
                <div className="font-medium">{w.word}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

