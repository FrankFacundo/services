"use client";
import { useEffect, useMemo, useState } from 'react';
import { buildQADocumentJson } from '@/lib/qa';

type ReviewState = 'not_started' | 'in_progress' | 'done';
type DocStatus = {
  adsRemoved: boolean;
  reviewQuestions: ReviewState;
  reviewImages: ReviewState;
};

export default function StatusPanel({ id, content, title, mdRelPath }: { id: string; content?: string; title?: string; mdRelPath?: string }) {
  const [status, setStatus] = useState<DocStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mdText, setMdText] = useState<string | undefined>(content);
  const [mdPath, setMdPath] = useState<string | undefined>(mdRelPath);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/status?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load status');
        if (mounted) setStatus(data.status as DocStatus);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load status');
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => { setMdText(content); }, [content]);
  useEffect(() => { setMdPath(mdRelPath); }, [mdRelPath]);

  // Learn mdRelPath from JsonPanel if not provided explicitly
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ mdRelPath?: string; title?: string }>;
      if (!mdPath && ev.detail?.mdRelPath) setMdPath(ev.detail.mdRelPath);
    };
    window.addEventListener('doc:register-json' as any, handler as any);
    return () => window.removeEventListener('doc:register-json' as any, handler as any);
  }, [mdPath]);

  const save = async (next: DocStatus) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save');
      setStatus(next);
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const colorForBool = (v: boolean) => v ? 'bg-green-200 text-green-900 dark:bg-green-800/50 dark:text-green-200' : 'bg-red-200 text-red-900 dark:bg-red-800/50 dark:text-red-100';
  const colorForState = (s: ReviewState) =>
    s === 'done' ? 'bg-green-200 text-green-900 dark:bg-green-800/50 dark:text-green-200' :
    s === 'in_progress' ? 'bg-yellow-200 text-yellow-900 dark:bg-yellow-800/50 dark:text-yellow-100' :
    'bg-red-200 text-red-900 dark:bg-red-800/50 dark:text-red-100';

  // Extracted JSON and diagnostics (same data source as JsonPanel)
  const data = useMemo(() => {
    if (!title || !mdText) return {} as any;
    return buildQADocumentJson(mdText, title);
  }, [mdText, title]);
  const counts = useMemo(() => {
    const root = (data as any)[title] || {};
    let total = 0;
    const byCat: { cat: string; count: number }[] = [];
    for (const cat of Object.keys(root)) {
      const c = Object.keys(root[cat] || {}).length;
      if (c > 0) byCat.push({ cat, count: c });
      total += c;
    }
    return { total, byCat };
  }, [data, title]);

  type ItemRef = { cat: string; key: string; problema?: string };
  const diagnostics = useMemo(() => {
    const root = (data as any)[title] || {} as Record<string, Record<string, any>>;
    const emptyCategoria: ItemRef[] = [];
    const emptyProblema: ItemRef[] = [];
    const wrongOpciones: ItemRef[] = [];
    const emptyRespuesta: ItemRef[] = [];
    const emptyClave: ItemRef[] = [];

    for (const cat of Object.keys(root)) {
      const entries = root[cat] || {};
      for (const key of Object.keys(entries)) {
        const q = entries[key] || {};
        const ref = { cat, key, problema: (q.Problema || '').slice(0, 80) } as ItemRef;
        if (!q.Categoria || String(q.Categoria).trim() === '') emptyCategoria.push(ref);
        if (!q.Problema || String(q.Problema).trim() === '') emptyProblema.push(ref);
        const opts = Array.isArray(q.Opciones) ? q.Opciones : [];
        if (opts.length !== 5) wrongOpciones.push(ref);
        if (!q.Respuesta || String(q.Respuesta).trim() === '') emptyRespuesta.push(ref);
        if (!q.Clave || String(q.Clave).trim() === '') emptyClave.push(ref);
      }
    }
    return { emptyCategoria, emptyProblema, wrongOpciones, emptyRespuesta, emptyClave };
  }, [data, title]);

  if (!status) {
    return <div className="text-xs text-gray-500">Loading status...</div>;
  }

  // Helpers to display only question numbers per requirement
  const formatKeys = (items: ItemRef[]) => {
    const nums = items
      .map((r) => r.key)
      .filter((k) => k != null)
      .map((k) => (String(k).match(/^\d+$/) ? Number(k) : k));
    const numeric = nums.filter((v) => typeof v === 'number') as number[];
    const nonNumeric = nums.filter((v) => typeof v !== 'number') as (string | number)[];
    numeric.sort((a, b) => a - b);
    const ordered = [...numeric, ...nonNumeric];
    return ordered.join(', ');
  };

  const refreshAll = async () => {
    setRefreshing(true);
    setError(null);
    try {
      // reload status
      const res = await fetch(`/api/status?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load status');
      setStatus(data.status as DocStatus);
      // reload markdown if path provided
      const path = mdPath;
      if (path) {
        const mdRes = await fetch(`/api/file?path=${encodeURIComponent(path)}`, { cache: 'no-store' });
        const text = await mdRes.text();
        setMdText(text);
        // notify JSON panels to refresh themselves
        try {
          window.dispatchEvent(new CustomEvent('doc:refresh-json', { detail: { mdRelPath: path } }));
        } catch {}
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center text-xs">
      {error && <div className="text-red-600">{error}</div>}
      <button
        type="button"
        onClick={refreshAll}
        className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        disabled={refreshing}
        title="Refresh status and re-parse JSON"
      >{refreshing ? 'Refreshing…' : 'Refresh'}</button>
      <div className="flex items-center gap-2">
        <span>Ads/garbage removed:</span>
        <button
          type="button"
          disabled={saving}
          className={`px-2 py-0.5 rounded ${colorForBool(status.adsRemoved)}`}
          onClick={() => save({ ...status, adsRemoved: !status.adsRemoved })}
        >{status.adsRemoved ? 'True' : 'False'}</button>
      </div>
      <div className="flex items-center gap-2">
        <span>Review questions:</span>
        {(['not_started','in_progress','done'] as ReviewState[]).map((s) => (
          <button
            key={s}
            type="button"
            disabled={saving}
            className={`px-2 py-0.5 rounded ${colorForState(s)} ${s===status.reviewQuestions ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
            onClick={() => save({ ...status, reviewQuestions: s })}
          >{s.replace('_',' ')}</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span>Review images:</span>
        {(['not_started','in_progress','done'] as ReviewState[]).map((s) => (
          <button
            key={s}
            type="button"
            disabled={saving}
            className={`px-2 py-0.5 rounded ${colorForState(s)} ${s===status.reviewImages ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
            onClick={() => save({ ...status, reviewImages: s })}
          >{s.replace('_',' ')}</button>
        ))}
      </div>

      {/* Extracted JSON quick info and diagnostics */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1" aria-hidden />
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-gray-600 dark:text-gray-300">QA:</span>
        <span className="text-gray-600 dark:text-gray-300">
          {counts.total} questions{counts.byCat.length > 0 && ' · '}
          {counts.byCat.map((x) => `${x.cat}: ${x.count}`).join(' · ')}
        </span>
      </div>
      {/* One-per-line checks under the bar, truncated to avoid overflow */}
      <div className="w-full flex flex-col gap-0.5 mt-1 min-w-0">
        {diagnostics.emptyCategoria.length > 0 && (
          <div className="truncate text-red-700 dark:text-red-300" title={`Empty categoria: ${formatKeys(diagnostics.emptyCategoria)}`}>
            Empty categoria: {formatKeys(diagnostics.emptyCategoria)}
          </div>
        )}
        {diagnostics.emptyProblema.length > 0 && (
          <div className="truncate text-red-700 dark:text-red-300" title={`Empty problema: ${formatKeys(diagnostics.emptyProblema)}`}>
            Empty problema: {formatKeys(diagnostics.emptyProblema)}
          </div>
        )}
        {diagnostics.wrongOpciones.length > 0 && (
          <div className="truncate text-yellow-700 dark:text-yellow-300" title={`Opciones ≠ 5: ${formatKeys(diagnostics.wrongOpciones)}`}>
            Opciones ≠ 5: {formatKeys(diagnostics.wrongOpciones)}
          </div>
        )}
        {diagnostics.emptyRespuesta.length > 0 && (
          <div className="truncate text-red-700 dark:text-red-300" title={`Empty respuesta: ${formatKeys(diagnostics.emptyRespuesta)}`}>
            Empty respuesta: {formatKeys(diagnostics.emptyRespuesta)}
          </div>
        )}
        {diagnostics.emptyClave.length > 0 && (
          <div className="truncate text-red-700 dark:text-red-300" title={`Empty clave: ${formatKeys(diagnostics.emptyClave)}`}>
            Empty clave: {formatKeys(diagnostics.emptyClave)}
          </div>
        )}
      </div>
    </div>
  );
}
