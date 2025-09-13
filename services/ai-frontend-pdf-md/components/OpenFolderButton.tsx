"use client";
import { useState } from 'react';

export default function OpenFolderButton({ relPath, label = 'Open Folder' }: { relPath: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/open-dir?path=${encodeURIComponent(relPath)}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Failed with ${res.status}`);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to open folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        title="Open the folder containing this document"
      >{loading ? 'Opening…' : label}</button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

