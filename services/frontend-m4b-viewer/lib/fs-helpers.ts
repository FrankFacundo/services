import { readdirSync, statSync } from "fs";
import path from "path";
import { getAbsoluteSafePath, relativeFromBase } from "@/lib/path-guard";
import type { DirEntry } from "@/lib/types";

export async function listDirectory(relPath: string): Promise<{ entries: DirEntry[]; crumb: { name: string; path: string }[] }>
{
  const safe = getAbsoluteSafePath(relPath);
  if (!safe.ok) throw new Error(safe.error);

  let entries: DirEntry[] = [];
  try {
    const items = readdirSync(safe.path, { withFileTypes: true });
    for (const item of items) {
      const abs = path.join(safe.path, item.name);
      const rel = relativeFromBase(abs);
      if (item.isDirectory()) {
        entries.push({ name: item.name, type: "dir", relPath: rel });
      } else if (item.isFile()) {
        if (item.name.toLowerCase().endsWith(".m4b")) {
          entries.push({ name: item.name, type: "file", relPath: rel });
        }
      }
    }
  } catch (e: any) {
    throw new Error(e?.message || "Failed to list directory");
  }

  entries.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));

  // breadcrumb
  const crumb: { name: string; path: string }[] = [];
  const parts = relPath.split("/").filter(Boolean);
  crumb.push({ name: "", path: "" });
  parts.forEach((p, idx) => {
    crumb.push({ name: p, path: parts.slice(0, idx + 1).join("/") });
  });

  return { entries, crumb };
}

