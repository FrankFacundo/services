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

type TranslationSegment = {
  start: number;
  end: number;
  text: string;
  originalText: string;
};

type Translation = {
  source: string;
  chapterIndex: number;
  targetLanguage: string;
  createdAt: string;
  detectedSourceLanguage?: string | null;
  segments: TranslationSegment[];
};

const COMMON_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese (Simplified)" },
];

export default function TranscriptViewer({ relPath, chapterIndex }: { relPath: string; chapterIndex: number }) {
  const [data, setData] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [targetLang, setTargetLang] = useState("es");
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationMissing, setTranslationMissing] = useState(false);
  const [translating, setTranslating] = useState(false);

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
    if (!data) {
      setTranslation(null);
      setTranslationMissing(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setTranslationLoading(true);
      setTranslationError(null);
      setTranslationMissing(false);
      setTranslation(null);
      try {
        const params = new URLSearchParams({
          path: relPath,
          chapter: String(data.chapterIndex),
          lang: targetLang,
        });
        const r = await fetch(`/api/transcribe/translate?${params.toString()}`);
        if (cancelled) return;
        if (r.ok) {
          const json = await r.json();
          if (!cancelled) setTranslation(json);
        } else if (r.status === 404) {
          if (!cancelled) {
            setTranslation(null);
            setTranslationMissing(true);
          }
        } else {
          let message = `Failed to load translation (${r.status})`;
          try {
            const payload = await r.json();
            if (payload?.error) message = payload.error;
          } catch {}
          if (!cancelled) {
            setTranslationError(message);
            setTranslation(null);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setTranslationError(e?.message || "Failed to load translation");
          setTranslation(null);
        }
      } finally {
        if (!cancelled) setTranslationLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [data?.chapterIndex, relPath, targetLang]);

  async function requestTranslation(force = false) {
    if (!data || translating) return;
    setTranslating(true);
    setTranslationError(null);
    try {
      const r = await fetch(`/api/transcribe/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: relPath,
          chapter: data.chapterIndex,
          targetLanguage: targetLang,
          force,
        }),
      });
      const json = await r.json().catch(() => null);
      if (!r.ok) {
        throw new Error(json?.error || `Translation failed (${r.status})`);
      }
      setTranslation(json);
      setTranslationMissing(false);
    } catch (e: any) {
      setTranslationError(e?.message || "Translation failed");
    } finally {
      setTranslating(false);
    }
  }

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
  const translationSegments = translation?.segments || [];
  const translationReady = Boolean(translation && !translationMissing && !translationError);
  const buttonLabel = translating
    ? "Translating…"
    : translationReady
    ? "Refresh translation"
    : "Generate translation";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            Play/Pause
          </button>
          <div className="text-sm text-gray-600 dark:text-gray-300">Chapter {data.chapterIndex + 1}</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="translation-language" className="text-gray-600 dark:text-gray-300">Target language</label>
          <select
            id="translation-language"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
          >
            {COMMON_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => requestTranslation(Boolean(translation))}
          disabled={translating || translationLoading}
          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {buttonLabel}
        </button>
      </div>
      {translationError && <div className="text-sm text-red-600">{translationError}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Original transcript</h4>
          {segments.map((s, i) => {
            const segWords = words.filter((w) => (w.end ?? 0) > s.start && (w.start ?? 0) < s.end);
            const isActive = active.segIdx === i;
            return (
              <p
                key={i}
                className={`leading-relaxed px-2 rounded whitespace-pre-wrap ${isActive ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
              >
                {segWords.length > 0 ? (
                  segWords.map((w, wi) => (
                    <span
                      key={`${i}-${wi}-${w.start}`}
                      onClick={() => {
                        const el = audioRef.current;
                        if (el) el.currentTime = Math.max(0, (w.start ?? s.start) - 0.05);
                      }}
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
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Translation</h4>
          {translationLoading && (
            <div className="text-sm text-gray-600 dark:text-gray-300">Loading translation…</div>
          )}
          {!translationLoading && translationMissing && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              No translation available yet for {targetLang.toUpperCase()}.
            </div>
          )}
          {translationReady && translationSegments.length === 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-300">No translated segments returned.</div>
          )}
          {translationReady && translationSegments.length > 0 && (
            translationSegments.map((seg, i) => {
              const isActive = active.segIdx === i;
              return (
                <p
                  key={`${seg.start}-${seg.end}-${i}`}
                  onClick={() => {
                    const el = audioRef.current;
                    if (el) el.currentTime = Math.max(0, seg.start - 0.05);
                  }}
                  className={`leading-relaxed px-2 rounded whitespace-pre-wrap cursor-pointer ${isActive ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                  title={`${seg.start.toFixed(2)}–${seg.end.toFixed(2)}s`}
                >
                  {seg.text || <span className="text-gray-500">(empty)</span>}
                </p>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
