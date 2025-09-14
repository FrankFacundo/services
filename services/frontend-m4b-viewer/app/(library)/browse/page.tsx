import Link from "next/link";
import { listDirectory } from "@/lib/fs-helpers";

export const dynamic = "force-dynamic";

export default async function BrowsePage({ searchParams }: { searchParams: { path?: string } }) {
  const path = (searchParams?.path ?? "").toString();
  const { entries, crumb } = await listDirectory(path);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Browse</h1>
      <nav className="text-sm text-gray-600">
        {crumb.map((c, i) => (
          <span key={i}>
            {i > 0 && " / "}
            <Link href={`/browse?path=${encodeURIComponent(c.path)}`}>{c.name || "Library"}</Link>
          </span>
        ))}
      </nav>
      <div className="rounded border divide-y bg-white">
        {entries.map((e) => (
          <div key={e.name} className="flex items-center justify-between p-3 hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="inline-block w-5 text-gray-500">{e.type === "dir" ? "📁" : "🎧"}</span>
              <span className="font-medium">{e.name}</span>
            </div>
            <div>
              {e.type === "dir" ? (
                <Link className="text-blue-600" href={`/browse?path=${encodeURIComponent(e.relPath)}`}>Open</Link>
              ) : (
                <Link className="text-blue-600" href={`/file/${e.relPath.split("/").map(encodeURIComponent).join("/")}`}>View</Link>
              )}
            </div>
          </div>
        ))}
        {entries.length === 0 && <div className="p-6 text-gray-500">Empty folder</div>}
      </div>
    </div>
  );
}

