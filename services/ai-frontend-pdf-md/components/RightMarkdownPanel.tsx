"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Toc from '@/components/Toc';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import type { Heading } from '@/lib/markdown';
import { extractHeadings } from '@/lib/markdown';

export default function RightMarkdownPanel({
  headings,
  content,
  mdRelPath,
}: {
  headings: Heading[];
  content: string;
  mdRelPath: string;
}) {
  const [showSource, setShowSource] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [text, setText] = useState(content);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const lastScrollRatioRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(content);
    setDirty(false);
  }, [content]);

  const liveHeadings: Heading[] = useMemo(() => extractHeadings(text), [text]);

  const doSave = useCallback(async () => {
    if (saving || !dirty) return;
    setSaving(true);
    setSaveErr(null);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: mdRelPath, content: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save');
      setDirty(false);
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(null), 1500);
    } catch (e: any) {
      setSaveErr(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [saving, dirty, mdRelPath, text]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        doSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doSave]);

  const restoreScrollFromRatio = useCallback(() => {
    const ratio = lastScrollRatioRef.current;
    if (ratio == null || !isFinite(ratio)) return;
    const clamp = (n: number) => Math.min(1, Math.max(0, n));

    const applyRendered = () => {
      const el = contentScrollRef.current;
      if (!el) return;
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = max * clamp(ratio);
    };
    const applySource = () => {
      const ta = textareaRef.current;
      if (!ta) return;
      const max = Math.max(0, ta.scrollHeight - ta.clientHeight);
      ta.scrollTop = max * clamp(ratio);
    };

    const apply = showSource ? applySource : applyRendered;
    // Try multiple frames to allow layout (math/images) to settle.
    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(() => {
        apply();
        requestAnimationFrame(apply);
      });
    });
  }, [showSource]);

  const toggleSource = () => {
    if (!showSource) {
      // Currently rendered → capture container scroll ratio
      const el = contentScrollRef.current;
      if (el) {
        const max = Math.max(1, el.scrollHeight - el.clientHeight);
        lastScrollRatioRef.current = el.scrollTop / max;
      }
    } else {
      // Currently source → capture textarea scroll ratio
      const ta = textareaRef.current;
      if (ta) {
        const max = Math.max(1, ta.scrollHeight - ta.clientHeight);
        lastScrollRatioRef.current = ta.scrollTop / max;
      }
    }
    setShowSource((v) => !v);
  };

  useEffect(() => {
    restoreScrollFromRatio();
  }, [showSource, showToc, restoreScrollFromRatio]);

  return (
    <div className="h-full overflow-auto flex flex-col">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 p-2 flex items-center justify-between">
        <div className="text-sm font-medium">Table of Contents</div>
        <div className="flex items-center gap-2 w-full justify-end">
          <button
            type="button"
            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => setShowToc((v) => !v)}
            aria-pressed={showToc}
            aria-label="Show or hide table of contents"
          >
            {showToc ? 'Hide TOC' : 'Show TOC'}
          </button>
          {showSource && (
            <button
              type="button"
              className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              onClick={doSave}
              disabled={!dirty || saving}
              aria-label="Save markdown (Ctrl/Cmd+S)"
            >
              {saving ? 'Saving…' : dirty ? 'Save' : (saveMsg ?? 'Saved')}
            </button>
          )}
          <span className="text-xs text-gray-500">View:</span>
          <button
            type="button"
            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={toggleSource}
            aria-pressed={showSource}
            aria-label="Toggle source/rendered view"
          >
            {showSource ? 'Source' : 'Rendered'}
          </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {showToc && (
          <div className="hidden md:block w-64 border-r border-gray-200 dark:border-gray-800 p-3 overflow-auto">
            <Toc headings={showSource ? liveHeadings : headings} />
          </div>
        )}
        <div ref={contentScrollRef} className="flex-1 p-3 overflow-auto">
          {showSource ? (
            <>
              {saveErr && (
                <div className="mb-2 text-xs text-red-600">{saveErr}</div>
              )}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => { setText(e.target.value); setDirty(true); setSaveErr(null); }}
                onKeyDown={(e) => {
                  const isMac = navigator.platform.toUpperCase().includes('MAC');
                  const isCutLine = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'x';
                  const ta = textareaRef.current;
                  if (!isCutLine || !ta) return;
                  const selStart = ta.selectionStart ?? 0;
                  const selEnd = ta.selectionEnd ?? selStart;
                  if (selStart !== selEnd) return; // let default cut selection
                  e.preventDefault();
                  const src = text;
                  const beforeNL = src.lastIndexOf('\n', Math.max(0, selStart - 1));
                  const lineStart = beforeNL === -1 ? 0 : beforeNL + 1;
                  const nextNL = src.indexOf('\n', selStart);
                  const hasNextNL = nextNL !== -1;
                  const delEnd = hasNextNL ? nextNL + 1 : src.length;
                  const newValue = src.slice(0, lineStart) + src.slice(delEnd);
                  setText(newValue);
                  setDirty(true);
                  setSaveErr(null);
                  // Restore caret near the start of deleted line position
                  requestAnimationFrame(() => {
                    const n = textareaRef.current;
                    if (!n) return;
                    n.selectionStart = n.selectionEnd = lineStart;
                    // maintain approximate scroll position
                    const max = Math.max(0, n.scrollHeight - n.clientHeight);
                    const ratio = n.scrollTop / (max || 1);
                    n.scrollTop = Math.max(0, n.scrollHeight - n.clientHeight) * ratio;
                  });
                }}
                className="w-full h-full min-h-[60vh] text-sm font-mono rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Edit markdown source"
              />
            </>
          ) : (
            <MarkdownRenderer content={text} mdRelPath={mdRelPath} />
          )}
        </div>
      </div>
    </div>
  );
}
