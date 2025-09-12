"use client";
import { useEffect, useState } from 'react';

type ReviewState = 'not_started' | 'in_progress' | 'done';
type DocStatus = {
  adsRemoved: boolean;
  reviewQuestions: ReviewState;
  reviewImages: ReviewState;
};

export default function InlineStatusControls({ id, initial }: { id: string; initial: DocStatus }) {
  const [status, setStatus] = useState<DocStatus>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setStatus(initial); }, [initial]);

  const save = async (next: DocStatus) => {
    setSaving(true);
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus(next);
    } finally {
      setSaving(false);
    }
  };

  const colorForBool = (v: boolean) => v ? 'bg-green-200 text-green-900 dark:bg-green-800/50 dark:text-green-200' : 'bg-red-200 text-red-900 dark:bg-red-800/50 dark:text-red-100';
  const colorForState = (s: ReviewState) =>
    s === 'done' ? 'text-green-700 dark:text-green-300' : s === 'in_progress' ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300';

  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        type="button"
        disabled={saving}
        className={`px-2 py-0.5 rounded ${colorForBool(status.adsRemoved)}`}
        onClick={(e) => { e.stopPropagation(); save({ ...status, adsRemoved: !status.adsRemoved }); }}
        title="Toggle ads/garbage removed"
      >Ads: {status.adsRemoved ? 'True' : 'False'}</button>

      <label className="sr-only" htmlFor={`qs-${id}`}>Review questions</label>
      <select
        id={`qs-${id}`}
        disabled={saving}
        className={`border border-gray-300 dark:border-gray-700 rounded px-1 py-0.5 bg-transparent ${colorForState(status.reviewQuestions)}`}
        value={status.reviewQuestions}
        onChange={(e) => { const v = e.target.value as ReviewState; save({ ...status, reviewQuestions: v }); }}
        onClick={(e) => e.stopPropagation()}
        title="Review questions"
      >
        <option value="not_started">Not started</option>
        <option value="in_progress">In progress</option>
        <option value="done">Done</option>
      </select>

      <label className="sr-only" htmlFor={`img-${id}`}>Review images</label>
      <select
        id={`img-${id}`}
        disabled={saving}
        className={`border border-gray-300 dark:border-gray-700 rounded px-1 py-0.5 bg-transparent ${colorForState(status.reviewImages)}`}
        value={status.reviewImages}
        onChange={(e) => { const v = e.target.value as ReviewState; save({ ...status, reviewImages: v }); }}
        onClick={(e) => e.stopPropagation()}
        title="Review images"
      >
        <option value="not_started">Not started</option>
        <option value="in_progress">In progress</option>
        <option value="done">Done</option>
      </select>
    </div>
  );
}

