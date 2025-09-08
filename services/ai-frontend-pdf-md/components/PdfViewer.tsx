"use client";
import { Document, Page, pdfjs } from 'react-pdf';
import { useEffect, useMemo, useRef, useState } from 'react';

// Configure worker via import.meta.url so Next bundles it
// Fallback to CDN if needed
try {
  // @ts-ignore
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
} catch {
  // eslint-disable-next-line no-console
  console.warn('Falling back to CDN worker for pdfjs');
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export default function PdfViewer({ fileUrl }: { fileUrl: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState(1.1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setPageNumber(1);
  }, [fileUrl]);

  const onLoadSuccess = ({ numPages: n }: { numPages: number }) => setNumPages(n);

  const pagesArray = useMemo(() => Array.from({ length: numPages }, (_, i) => i + 1), [numPages]);

  const scrollToPage = (p: number) => {
    const idx = Math.max(1, Math.min(p, numPages)) - 1;
    const el = pageRefs.current[idx];
    const container = scrollRef.current;
    if (el && container) {
      const top = el.offsetTop;
      container.scrollTo({ top: top - 8, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur z-10">
        <button className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700" onClick={() => setScale((s) => Math.min(3, s + 0.1))}>Zoom +</button>
        <button className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700" onClick={() => setScale((s) => Math.max(0.3, s - 0.1))}>Zoom -</button>
        <div className="ml-2"></div>
        <button
          className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700"
          onClick={() => {
            setPageNumber((p) => {
              const next = Math.max(1, p - 1);
              scrollToPage(next);
              return next;
            });
          }}
          aria-label="Previous page"
        >◀</button>
        <div className="text-sm">Page {pageNumber} / {numPages || '?'}</div>
        <button
          className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700"
          onClick={() => {
            setPageNumber((p) => {
              const next = Math.min(numPages || p, p + 1);
              scrollToPage(next);
              return next;
            });
          }}
          aria-label="Next page"
        >▶</button>
        <div className="ml-2 flex items-center gap-2">
          <label className="text-xs text-gray-600 dark:text-gray-300">Scroll</label>
          <input
            type="range"
            min={1}
            max={Math.max(1, numPages)}
            value={pageNumber}
            onChange={(e) => {
              const v = Number(e.target.value) || 1;
              setPageNumber(v);
              scrollToPage(v);
            }}
          />
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto p-3">
        <Document file={fileUrl} onLoadSuccess={onLoadSuccess} onLoadError={() => setNumPages(0)} loading={<div className="text-sm text-gray-500">Loading PDF...</div>}>
          <div className="flex flex-col items-center gap-6">
            {pagesArray.map((p, i) => (
              <div key={p} ref={(el) => (pageRefs.current[i] = el)}>
                <Page pageNumber={p} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
              </div>
            ))}
          </div>
        </Document>
      </div>
    </div>
  );
}
