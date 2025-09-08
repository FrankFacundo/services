"use client";
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SearchBox({ initialQuery = '' }: { initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    setQ(params.get('q') ?? '');
  }, [params]);
  return (
    <div className="flex items-center gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/?q=${encodeURIComponent(q)}`); }}
        placeholder="Search by title or id..."
        className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        className="px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => router.push(`/?q=${encodeURIComponent(q)}`)}
      >Search</button>
    </div>
  );
}

