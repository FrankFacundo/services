"use client";
import { Document, Page, pdfjs } from 'react-pdf';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    setPageNumber(1);
  }, [fileUrl]);

  const onLoadSuccess = ({ numPages: n }: { numPages: number }) => setNumPages(n);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur z-10">
        <button className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700" onClick={() => setScale((s) => Math.min(3, s + 0.1))}>Zoom +</button>
        <button className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700" onClick={() => setScale((s) => Math.max(0.3, s - 0.1))}>Zoom -</button>
        <div className="ml-2"></div>
        <button className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700" onClick={() => setPageNumber((p) => Math.max(1, p - 1))} aria-label="Previous page">◀</button>
        <div className="text-sm">Page {pageNumber} / {numPages || '?'}</div>
        <button className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700" onClick={() => setPageNumber((p) => Math.min(numPages || p, p + 1))} aria-label="Next page">▶</button>
      </div>
      <div className="flex-1 overflow-auto grid place-items-center p-3">
        <Document file={fileUrl} onLoadSuccess={onLoadSuccess} onLoadError={() => setNumPages(0)} loading={<div className="text-sm text-gray-500">Loading PDF...</div>}>
          <Page pageNumber={pageNumber} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
        </Document>
      </div>
    </div>
  );
}
