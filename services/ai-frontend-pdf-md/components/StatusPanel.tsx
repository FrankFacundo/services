"use client";
import { useEffect, useState } from 'react';

type ReviewState = 'not_started' | 'in_progress' | 'done';
type DocStatus = {
  adsRemoved: boolean;
  reviewQuestions: ReviewState;
  reviewImages: ReviewState;
};

export default function StatusPanel({ id }: { id: string }) {
  const [status, setStatus] = useState<DocStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!status) {
    return <div className="text-xs text-gray-500">Loading status...</div>;
  }

  return (
    <div className="flex flex-wrap gap-2 items-center text-xs">
      {error && <div className="text-red-600">{error}</div>}
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
    </div>
  );
}

