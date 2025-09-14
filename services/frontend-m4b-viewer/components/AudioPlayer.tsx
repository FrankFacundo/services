"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatTime } from "@/lib/time";

type Chapter = { title?: string; start: number };

export default function AudioPlayer({ src, relPath, chapters }: { src: string; relPath: string; chapters: Chapter[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);

  // Subtitles state
  type Word = { word: string; start: number; end: number };
  type Segment = { id?: number; start: number; end: number; text: string };
  type Transcript = { text: string; words?: Word[]; segments?: Segment[]; start: number; end: number; chapterIndex: number };
  const [subtitleStatus, setSubtitleStatus] = useState<"loading" | "exists" | "missing">("loading");
  const [subtitleData, setSubtitleData] = useState<Transcript | null>(null);

  const storageKey = useMemo(() => `m4b:pos:${relPath}`, [relPath]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const t = parseFloat(saved);
      if (!isNaN(t)) {
        const el = audioRef.current;
        if (el) el.currentTime = t;
      }
    }
  }, [storageKey]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setCurrent(el.currentTime);
      localStorage.setItem(storageKey, String(el.currentTime));
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onLoaded = () => setDuration(el.duration || 0);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("loadedmetadata", onLoaded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [storageKey]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    el.paused ? el.play() : el.pause();
  }
  function seek(delta: number) {
    const el = audioRef.current; if (!el) return;
    el.currentTime = Math.max(0, Math.min((el.duration || 0) - 0.2, el.currentTime + delta));
  }
  function goto(t: number) {
    const el = audioRef.current; if (!el) return;
    el.currentTime = t;
  }

  function changeRate(v: number) {
    const el = audioRef.current; if (!el) return;
    el.playbackRate = v; setRate(v);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName.toLowerCase() === "input") return;
      if (e.code === "Space" || e.key.toLowerCase() === "k") { e.preventDefault(); toggle(); }
      if (e.key.toLowerCase() === "j") seek(-15);
      if (e.key.toLowerCase() === "l") seek(15);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const nextPrev = useMemo(() => {
    const idx = chapters.findIndex(c => c.start > current + 0.2) - 1;
    const currentIdx = idx >= 0 ? idx : chapters.length - 1;
    return {
      currentIdx,
      prev: currentIdx > 0 ? chapters[currentIdx - 1] : undefined,
      next: currentIdx + 1 < chapters.length ? chapters[currentIdx + 1] : undefined,
    };
  }, [chapters, current]);

  const activeChapterIndex = nextPrev.currentIdx;

  // Load transcript for the active chapter to display subtitles
  useEffect(() => {
    let aborted = false;
    async function load() {
      if (activeChapterIndex == null || activeChapterIndex < 0 || !isFinite(activeChapterIndex)) {
        setSubtitleStatus("missing"); setSubtitleData(null); return;
      }
      setSubtitleStatus("loading");
      try {
        const r = await fetch(`/api/transcribe?path=${encodeURIComponent(relPath)}&chapter=${activeChapterIndex}`);
        if (aborted) return;
        if (!r.ok) { setSubtitleStatus("missing"); setSubtitleData(null); return; }
        const json = await r.json();
        setSubtitleData(json);
        setSubtitleStatus("exists");
      } catch {
        if (!aborted) { setSubtitleStatus("missing"); setSubtitleData(null); }
      }
    }
    load();
    return () => { aborted = true; };
  }, [relPath, activeChapterIndex]);

  const subtitle = useMemo(() => {
    if (!subtitleData) return null as React.ReactNode;
    const segsRaw = subtitleData.segments || [];
    const segs = segsRaw.length > 0
      ? segsRaw
      : [{ start: subtitleData.start ?? 0, end: (subtitleData.end ?? Number.MAX_SAFE_INTEGER), text: subtitleData.text ?? "" }];
    let segIdx = segs.findIndex(s => current >= (s.start ?? 0) && current < (s.end ?? Number.MAX_SAFE_INTEGER));
    if (segIdx < 0) {
      for (let i = segs.length - 1; i >= 0; i--) { if (current >= (segs[i].start ?? 0)) { segIdx = i; break; } }
    }
    if (segIdx < 0) segIdx = 0; // show first segment until playback enters range
    const seg = segs[segIdx] || segs[0];
    const segStart = seg?.start ?? 0;
    const segEnd = seg?.end ?? Number.MAX_SAFE_INTEGER;
    const words = (subtitleData.words || []).filter(w => (w.end ?? 0) > segStart && (w.start ?? 0) < segEnd);
    if (words.length === 0) return seg?.text || "";
    const activeWordIdx = words.findIndex(w => current >= (w.start ?? segStart) && current < (w.end ?? segEnd));
    return (
      <span>
        {words.map((w, i) => (
          <span key={`${i}-${w.start}`} className={`${i === activeWordIdx ? 'bg-yellow-200 dark:bg-yellow-600/50' : ''}`}>{w.word}{" "}</span>
        ))}
      </span>
    );
  }, [subtitleData, current]);

  return (
    <div className="rounded border bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
      <audio
        ref={audioRef}
        src={src}
        controls
        className="w-full"
        preload="metadata"
        data-relpath={encodeURIComponent(relPath)}
        data-relpath-raw={relPath}
      />
      <div className="mt-3 flex items-center gap-2 text-sm">
        <button aria-label="Play/Pause" onClick={toggle} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">
          {playing ? "Pause" : "Play"}
        </button>
        <button aria-label="Back 15s" onClick={() => seek(-15)} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">−15s</button>
        <button aria-label="Forward 15s" onClick={() => seek(15)} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">+15s</button>
        <div className="ml-2 text-gray-600 dark:text-gray-300">{formatTime(current)} / {formatTime(duration)}</div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-gray-600 dark:text-gray-300">Speed</label>
          <select aria-label="Playback rate" value={rate} onChange={(e) => changeRate(parseFloat(e.target.value))} className="border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600">
            {[0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
              <option key={r} value={r}>{r}×</option>
            ))}
          </select>
          {nextPrev.prev && (
            <button aria-label="Previous chapter" onClick={() => goto(nextPrev.prev!.start)} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">⟵ Chapter</button>
          )}
          {nextPrev.next && (
            <button aria-label="Next chapter" onClick={() => goto(nextPrev.next!.start)} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">Chapter ⟶</button>
          )}
        </div>
        {/* Subtitles area */}
        <div className="mt-2 text-sm rounded px-2 py-1 min-h-[2.25rem] bg-gray-50 text-gray-900 dark:bg-gray-700 dark:text-gray-100">
          {subtitleStatus === "loading" && <span className="text-gray-500 dark:text-gray-300">Loading subtitles…</span>}
          {subtitleStatus === "missing" && <span className="text-gray-500 dark:text-gray-300">No subtitles (transcription missing for this chapter).</span>}
          {subtitleStatus === "exists" && subtitle}
        </div>
      </div>
    </div>
  );
}
