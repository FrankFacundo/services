"use client";
import { useEffect, useMemo, useState } from "react";
import TranscriptViewer from "@/components/TranscriptViewer";

type Chapter = { title?: string; start: number };

export default function CurrentTranscript({ relPath, chapters }: { relPath: string; chapters: Chapter[] }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [chapterIndex, setChapterIndex] = useState<number>(0);
  const [status, setStatus] = useState<"loading" | "exists" | "missing">("loading");

  useEffect(() => {
    const encoded = encodeURIComponent(relPath);
    const el =
      document.querySelector<HTMLAudioElement>(`audio[data-relpath="${CSS.escape(encoded)}"]`) ||
      document.querySelector<HTMLAudioElement>(`audio[src*="${CSS.escape(encoded)}"]`) ||
      document.querySelector("audio");
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    el.addEventListener("timeupdate", onTime);
    // initialize immediately
    setCurrentTime(el.currentTime || 0);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [relPath]);

  const computedIdx = useMemo(() => {
    if (!chapters || chapters.length === 0) return -1;
    const idx = chapters.findIndex((c, i) => currentTime >= c.start && (i + 1 >= chapters.length || currentTime < chapters[i + 1].start));
    return idx >= 0 ? idx : (currentTime < (chapters[0]?.start ?? 0) ? 0 : chapters.length - 1);
  }, [chapters, currentTime]);

  useEffect(() => { setChapterIndex(computedIdx); }, [computedIdx]);

  useEffect(() => {
    let aborted = false;
    async function check() {
      if (chapterIndex == null || chapterIndex < 0) { setStatus("missing"); return; }
      setStatus("loading");
      try {
        const r = await fetch(`/api/transcribe?path=${encodeURIComponent(relPath)}&chapter=${chapterIndex}`);
        if (aborted) return;
        setStatus(r.ok ? "exists" : "missing");
      } catch {
        if (aborted) return; setStatus("missing");
      }
    }
    check();
    return () => { aborted = true; };
  }, [relPath, chapterIndex]);

  const title = chapterIndex >= 0 && chapters[chapterIndex] ? (chapters[chapterIndex].title || `Chapter ${chapterIndex + 1}`) : "No chapter";

  return (
    <div className="rounded border bg-white p-3 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-2">
        <h3 className="font-semibold">Transcript: {title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded border ${status === 'exists' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' : status === 'loading' ? 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600' : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800'}`}>
          {status === 'exists' ? 'Available' : status === 'loading' ? 'Checking…' : 'Not transcribed'}
        </span>
      </div>
      {chapterIndex >= 0 ? (
        status === 'exists' ? (
          <TranscriptViewer relPath={relPath} chapterIndex={chapterIndex} />
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-300">Transcribe was not done for this chapter.</div>
        )
      ) : (
        <div className="text-sm text-gray-600 dark:text-gray-300">No chapters detected for this file.</div>
      )}
    </div>
  );
}

