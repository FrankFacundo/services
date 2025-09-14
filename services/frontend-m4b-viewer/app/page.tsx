import Link from "next/link";

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Welcome to M4B Library Browser</h1>
      <p className="text-gray-700 mb-4">
        Browse your audiobook library from the sidebar. Select a file to view metadata, chapters, structure, and play it in your browser.
      </p>
      <ul className="list-disc pl-6 text-gray-700 space-y-2">
        <li>Server-secure directory browsing under your configured library directory.</li>
        <li>Rich metadata via music-metadata, optional ffprobe structure view.</li>
        <li>HTTP Range streaming, chapter navigation, speed control, and position memory.</li>
      </ul>
      <div className="mt-6">
        <Link href="/browse" className="text-blue-600 hover:underline">Open Library Browser →</Link>
      </div>
    </div>
  );
}

