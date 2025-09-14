import path from "path";

const AUDIO_LIBRARY_DIR = process.env.AUDIO_LIBRARY_DIR || "";

export function guardPath(relPath: string): { ok: boolean; path?: string; error?: string } {
  try {
    return getAbsoluteSafePath(relPath);
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Invalid path" };
  }
}

export function getAbsoluteSafePath(relPath: string): { ok: true; path: string } | { ok: false; error: string } {
  if (!AUDIO_LIBRARY_DIR) return { ok: false, error: "AUDIO_LIBRARY_DIR not set" };
  const base = path.resolve(AUDIO_LIBRARY_DIR);
  const joined = path.resolve(base, relPath || ".");
  if (!joined.startsWith(base)) {
    return { ok: false, error: "Path traversal detected" };
  }
  return { ok: true, path: joined };
}

export function relativeFromBase(absPath: string): string {
  const base = path.resolve(AUDIO_LIBRARY_DIR);
  return path.relative(base, absPath);
}

