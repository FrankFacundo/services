import Link from 'next/link';
import { listDocs } from '@/lib/scan';
import SearchBox from '@/components/SearchBox';
import SortToggle from '@/components/SortToggle';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

type Order = 'asc' | 'desc';

async function DocsList({ query, order }: { query: string; order: Order }) {
  let docs: Awaited<ReturnType<typeof listDocs>> = [];
  try {
    docs = await listDocs();
  } catch (e: any) {
    return (
      <div className="p-4 border rounded-md border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
        {e?.message || 'Failed to list docs'}. Ensure DOCS_ROOT is set and points to a valid directory.
      </div>
    );
  }
  const q = query.trim().toLowerCase();
  const filtered = q
    ? docs.filter((d) => d.id.toLowerCase().includes(q) || d.title.toLowerCase().includes(q))
    : docs;
  const sorted = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  if (order === 'desc') sorted.reverse();
  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden">
      {sorted.map((d) => (
        <li key={d.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
          <Link href={`/doc/${encodeURIComponent(d.id)}`} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{d.title}</div>
              <div className="text-xs text-gray-500">{d.id}</div>
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Open →</div>
          </Link>
        </li>
      ))}
      {sorted.length === 0 && (
        <li className="p-6 text-center text-sm text-gray-500">No documents match your search.</li>
      )}
    </ul>
  );
}

export default async function Page({ searchParams }: { searchParams?: { q?: string } }) {
  const q = searchParams?.q ?? '';
  const order = (searchParams?.order === 'asc' ? 'asc' : 'desc') as Order;
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Documents</h1>
      <div className="flex items-center gap-2">
        <div className="flex-1"><SearchBox initialQuery={q} /></div>
        <SortToggle />
      </div>
      <Suspense>
        {/* @ts-expect-error Async Server Component */}
        <DocsList query={q} order={order} />
      </Suspense>
      <p className="text-xs text-gray-500">
        DOCS_ROOT must be configured. See README for setup.
      </p>
    </div>
  );
}
