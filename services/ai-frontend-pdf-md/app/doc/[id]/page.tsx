import { getDocWithContent, listDocs } from '@/lib/scan';
import SplitPane from '@/components/SplitPane';
import nextDynamic from 'next/dynamic';
import RightMarkdownPanel from '@/components/RightMarkdownPanel';
import JsonPanel from '@/components/JsonPanel';
import StatusPanel from '@/components/StatusPanel';
import { extractHeadings } from '@/lib/markdown';
import Link from 'next/link';

const PdfViewer = nextDynamic(() => import('@/components/PdfViewer'), { ssr: false });

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  // not prebuilding, but this supports better DX if opted
  const docs = await listDocs();
  return docs.map((d) => ({ id: d.id }));
}

export default async function DocPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const doc = await getDocWithContent(id);
  if (!doc) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="p-6 border rounded-md border-red-300 text-red-700 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
          Document not found.
        </div>
      </div>
    );
  }
  const { title, pdfRel, mdRel, id: docId, mdContent } = doc;
  const pdfUrl = `/api/file?path=${encodeURIComponent(pdfRel)}`;
  const mdUrl = `/api/file?path=${encodeURIComponent(mdRel)}`;
  const headings = extractHeadings(mdContent);

  return (
    <div className="max-w-[1400px] mx-auto space-y-3">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="text-xs text-gray-500">{docId}</div>
        </div>
        <div className="flex gap-2 items-center">
          {/* Status controls + QA diagnostics */}
          <StatusPanel id={docId} content={mdContent} title={title} />
          <a className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" href={pdfUrl} target="_blank" rel="noreferrer">Open PDF</a>
          <a className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" href={mdUrl} target="_blank" rel="noreferrer">Open MD</a>
          <Link className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" href="/">Back</Link>
        </div>
      </div>
      <SplitPane leftTitle="PDF" rightTitle="Markdown · JSON">
        <div className="h-full overflow-auto">
          {pdfRel ? (
            <PdfViewer fileUrl={pdfUrl} />
          ) : (
            <div className="p-4 text-sm text-gray-500">PDF missing.</div>
          )}
        </div>
        {/* Nest a second split on the right to show Markdown and JSON side-by-side */}
        <div className="h-full">
          <SplitPane leftTitle="Markdown" rightTitle="JSON">
            <RightMarkdownPanel headings={headings} content={mdContent} mdRelPath={mdRel} />
            <JsonPanel content={mdContent} title={title} mdRelPath={mdRel} />
          </SplitPane>
        </div>
      </SplitPane>
    </div>
  );
}
