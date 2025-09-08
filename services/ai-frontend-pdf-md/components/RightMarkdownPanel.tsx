"use client";
import { useState } from 'react';
import Toc from '@/components/Toc';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import type { Heading } from '@/lib/markdown';

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
  const [showToc, setShowToc] = useState(true);

  return (
    <div className="h-full overflow-auto flex flex-col">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 p-2 flex items-center justify-between">
        <div className="text-sm font-medium">Table of Contents</div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">View:</span>
          <button
            type="button"
            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => setShowSource((v) => !v)}
            aria-pressed={showSource}
            aria-label="Toggle source/rendered view"
          >
            {showSource ? 'Source' : 'Rendered'}
          </button>
          <span className="sr-only">|</span>
          <button
            type="button"
            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => setShowToc((v) => !v)}
            aria-pressed={showToc}
            aria-label="Show or hide table of contents"
          >
            {showToc ? 'Hide TOC' : 'Show TOC'}
          </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {showToc && (
          <div className="hidden md:block w-64 border-r border-gray-200 dark:border-gray-800 p-3 overflow-auto">
            <Toc headings={headings} />
          </div>
        )}
        <div className="flex-1 p-3 overflow-auto">
          {showSource ? (
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 overflow-auto">
{content}
            </pre>
          ) : (
            <MarkdownRenderer content={content} mdRelPath={mdRelPath} />
          )}
        </div>
      </div>
    </div>
  );
}
