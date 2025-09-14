"use client";
import { useEffect, useMemo, useRef, useState } from "react";

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

export default function TranscriptViewer({ relPath, chapterIndex }: { relPath: string; chapterIndex: number }) {
  const [data, setData] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchTranscript = async () => {
    setLoading(true); setError(null);
    try {
      const url = `/api/transcribe?path=${encodeURIComponent(relPath)}&chapter=${chapterIndex}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error((await r.json()).error || `Failed (${r.status})`);
      const json = await r.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load transcript");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTranscript(); }, [relPath, chapterIndex]);

  useEffect(() => {
    // Bind to the matching audio element for this file.
    const encoded = encodeURIComponent(relPath);
    const el =
      document.querySelector<HTMLAudioElement>(`audio[data-relpath="${CSS.escape(encoded)}"]`) ||
      document.querySelector<HTMLAudioElement>(`audio[src*="${CSS.escape(encoded)}"]`) ||
      document.querySelector("audio");
    audioRef.current = el;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [relPath]);

  const active = useMemo(() => {
    if (!data) return { segIdx: -1, wordIdx: -1 };
    const t = currentTime;
    let segIdx = -1;
    if (data.segments && data.segments.length > 0) {
      segIdx = data.segments.findIndex((s) => t >= s.start && t < s.end);
      if (segIdx < 0) {
        // pick nearest previous
        for (let i = data.segments.length - 1; i >= 0; i--) {
          if (t >= data.segments[i].start) { segIdx = i; break; }
        }
      }
    }
    let wordIdx = -1;
    if (data.words && data.words.length > 0) {
      // binary search could be used; linear ok
      wordIdx = data.words.findIndex((w) => t >= (w.start ?? 0) && t < (w.end ?? 0));
    }
    return { segIdx, wordIdx };
  }, [data, currentTime]);

  function togglePlay() {
    const el = audioRef.current; if (!el) return;
    el.paused ? el.play() : el.pause();
  }

  if (loading) return <div className="text-sm text-gray-600 dark:text-gray-300">Loading transcript…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!data) return <div className="text-sm text-gray-600 dark:text-gray-300">No transcript found.</div>;

  const segments = data.segments || [{ start: data.start, end: data.end, text: data.text }];
  const words = data.words || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={togglePlay} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">Play/Pause</button>
        <div className="text-sm text-gray-600 dark:text-gray-300">Chapter {data.chapterIndex + 1}</div>
      </div>
      <div className="space-y-2">
        {segments.map((s, i) => {
          const segWords = words.filter((w) => (w.end ?? 0) > s.start && (w.start ?? 0) < s.end);
          return (
            <p key={i} className={`leading-relaxed px-2 rounded whitespace-pre-wrap ${active.segIdx === i ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
              {segWords.length > 0 ? (
                segWords.map((w, wi) => (
                  <span
                    key={`${i}-${wi}-${w.start}`}
                    onClick={() => { const el = audioRef.current; if (el) el.currentTime = Math.max(0, (w.start ?? s.start) - 0.05); }}
                    className={`cursor-pointer ${active.wordIdx >= 0 && words[active.wordIdx] === w ? 'bg-yellow-200 dark:bg-yellow-600/50' : ''}`}
                    title={`${(w.start ?? s.start).toFixed(2)}–${(w.end ?? s.end).toFixed(2)}s`}
                  >
                    {w.word}{" "}
                  </span>
                ))
              ) : (
                s.text
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
}
