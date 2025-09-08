import Link from 'next/link';
import type { Heading } from '@/lib/markdown';

export default function Toc({ headings }: { headings: Heading[] }) {
  if (!headings.length) return <div className="text-sm text-gray-500">No headings</div>;
  return (
    <nav aria-label="Table of contents">
      <ul className="space-y-1 text-sm">
        {headings.map((h, idx) => (
          <li key={`${h.id}-${idx}`} className="truncate" style={{ paddingLeft: (h.level - 1) * 12 }}>
            <Link className="text-blue-700 dark:text-blue-300 hover:underline" href={`#${h.id}`}>{h.text}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

