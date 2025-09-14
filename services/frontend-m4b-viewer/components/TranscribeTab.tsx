"use client";
import { useEffect, useState } from "react";
import TranscriptStatic from "@/components/TranscriptStatic";
import { formatTime } from "@/lib/time";

type Chapter = { title?: string; start: number };

type Status = "unknown" | "exists" | "missing" | "error";

export default function TranscribeTab({ relPath, chapters }: { relPath: string; chapters: Chapter[] }) {
  const [status, setStatus] = useState<Record<number, Status>>({});
  const [busy, setBusy] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const entries = await Promise.all(
        chapters.map(async (_c, i) => {
          try {
            const r = await fetch(`/api/transcribe?path=${encodeURIComponent(relPath)}&chapter=${i}`);
            return [i, r.ok ? "exists" : "missing"] as const;
          } catch {
            return [i, "error"] as const;
          }
        })
      );
      setStatus(Object.fromEntries(entries));
    };
    run();
  }, [relPath, chapters]);

  async function transcribe(i: number) {
    setBusy((b) => ({ ...b, [i]: true }));
    setError(null);
    try {
      const r = await fetch(`/api/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: relPath, chapter: i }),
      });
      if (!r.ok) throw new Error((await r.json()).error || `Failed (${r.status})`);
      setStatus((s) => ({ ...s, [i]: "exists" }));
      setSelected(i);
    } catch (e: any) {
      setError(e?.message || "Transcription failed");
    } finally {
      setBusy((b) => ({ ...b, [i]: false }));
    }
  }

  return (
    <div className="space-y-3">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="md:flex md:gap-4">
        {/* Left pane: chapters list */}
        <div className="md:w-1/2 md:min-w-[320px]">
          <div className="rounded border bg-white overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Start</th>
                  <th className="p-2">Title</th>
                  <th className="p-2">STT</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {chapters.map((c, i) => (
                  <tr key={i} className={`border-t dark:border-gray-700 ${selected === i ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''}`}>
                    <td className="p-2 w-12 text-right">{i + 1}</td>
                    <td className="p-2 font-mono text-sm w-28">{formatTime(c.start)}</td>
                    <td className="p-2">{c.title || `Chapter ${i + 1}`}</td>
                    <td className="p-2 w-24">
                      {status[i] === "exists" ? (
                        <span className="text-green-600">Ready</span>
                      ) : status[i] === "missing" ? (
                        <span className="text-gray-500">Missing</span>
                      ) : status[i] === "error" ? (
                        <span className="text-red-600">Error</span>
                      ) : (
                        <span className="text-gray-400">…</span>
                      )}
                    </td>
                    <td className="p-2 space-x-2">
                      <button
                        onClick={() => transcribe(i)}
                        disabled={busy[i]}
                        className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {busy[i] ? "Transcribing…" : "Transcribe"}
                      </button>
                      <button
                        onClick={() => setSelected(i)}
                        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right pane: transcript viewer */}
        <div className="md:flex-1 mt-4 md:mt-0">
          <div className="rounded border p-3 h-full dark:border-gray-700">
            <h3 className="font-semibold mb-2">{selected != null ? `Chapter ${selected + 1} Transcript` : "Transcript"}</h3>
            <div className="max-h-[60vh] overflow-auto">
              {selected != null ? (
                <TranscriptStatic relPath={relPath} chapterIndex={selected} />
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-300">Select a chapter to view its transcript.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
