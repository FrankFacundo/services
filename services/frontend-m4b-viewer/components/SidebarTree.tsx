"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Entry = { name: string; type: "dir" | "file"; relPath: string };

function useList(path: string) {
  const [data, setData] = useState<{ entries: Entry[]; crumb: { name: string; path: string }[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/list?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch((e) => !cancelled && setErr(e?.message || "Failed"));
    return () => {
      cancelled = true;
    };
  }, [path]);
  return { data, err };
}

export default function SidebarTree() {
  const { data } = useList("");
  return (
    <div className="p-2">
      <TreeNode path="" entries={data?.entries || []} level={0} />
    </div>
  );
}

function TreeNode({ path, entries, level }: { path: string; entries: Entry[]; level: number }) {
  const [open, setOpen] = useState(true);
  const { data } = useList(path);
  const dirs = (data?.entries || entries).filter((e) => e.type === "dir");
  const files = (data?.entries || entries).filter((e) => e.type === "file");
  return (
    <div>
      {path !== "" && (
        <div className="flex items-center justify-between pr-2 pl-2 py-1 cursor-pointer hover:bg-gray-50" onClick={() => setOpen(!open)}>
          <div className="flex items-center gap-2">
            <span>{open ? "📂" : "📁"}</span>
            <span className="truncate">{path.split("/").pop()}</span>
          </div>
          <span className="text-xs text-gray-500">{open ? "–" : "+"}</span>
        </div>
      )}
      <div className={open ? "block" : "hidden"}>
        {dirs.map((d) => (
          <div className="pl-3" key={d.relPath}>
            <TreeNode path={d.relPath} entries={[]} level={level + 1} />
          </div>
        ))}
        {files.map((f) => (
          <Link key={f.relPath} href={`/file/${f.relPath.split("/").map(encodeURIComponent).join("/")}`} className="flex items-center gap-2 pl-8 pr-2 py-1 hover:bg-gray-50">
            <span>🎧</span>
            <span className="truncate">{f.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

