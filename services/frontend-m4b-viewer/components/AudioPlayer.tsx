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

  return (
    <div className="rounded border bg-white p-4">
      <audio ref={audioRef} src={src} controls className="w-full" preload="metadata" />
      <div className="mt-3 flex items-center gap-2 text-sm">
        <button aria-label="Play/Pause" onClick={toggle} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">
          {playing ? "Pause" : "Play"}
        </button>
        <button aria-label="Back 15s" onClick={() => seek(-15)} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">−15s</button>
        <button aria-label="Forward 15s" onClick={() => seek(15)} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">+15s</button>
        <div className="ml-2 text-gray-600">{formatTime(current)} / {formatTime(duration)}</div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-gray-600">Speed</label>
          <select aria-label="Playback rate" value={rate} onChange={(e) => changeRate(parseFloat(e.target.value))} className="border rounded px-2 py-1">
            {[0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
              <option key={r} value={r}>{r}×</option>
            ))}
          </select>
          {nextPrev.prev && (
            <button aria-label="Previous chapter" onClick={() => goto(nextPrev.prev!.start)} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">⟵ Chapter</button>
          )}
          {nextPrev.next && (
            <button aria-label="Next chapter" onClick={() => goto(nextPrev.next!.start)} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">Chapter ⟶</button>
          )}
        </div>
      </div>
    </div>
  );
}

