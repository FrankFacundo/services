"use client";
import { useSearchParams, useRouter } from 'next/navigation';

export default function SortToggle() {
  const params = useSearchParams();
  const router = useRouter();
  const orderParam = params.get('order');
  const order = orderParam === 'asc' ? 'asc' : 'desc';
  const q = params.get('q') ?? '';

  const setOrder = (next: 'asc' | 'desc') => {
    const usp = new URLSearchParams(params.toString());
    usp.set('order', next);
    if (q) usp.set('q', q); else usp.delete('q');
    router.push(`/?${usp.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Order:</span>
      <button
        type="button"
        onClick={() => setOrder('asc')}
        className={`px-2 py-1 text-xs rounded border ${order === 'asc' ? 'border-blue-500 text-blue-600 dark:text-blue-300' : 'border-gray-300 dark:border-gray-700'} hover:bg-gray-50 dark:hover:bg-gray-800`}
        aria-pressed={order === 'asc'}
        aria-label="Sort ascending"
      >Asc</button>
      <button
        type="button"
        onClick={() => setOrder('desc')}
        className={`px-2 py-1 text-xs rounded border ${order === 'desc' ? 'border-blue-500 text-blue-600 dark:text-blue-300' : 'border-gray-300 dark:border-gray-700'} hover:bg-gray-50 dark:hover:bg-gray-800`}
        aria-pressed={order === 'desc'}
        aria-label="Sort descending"
      >Desc</button>
    </div>
  );
}
