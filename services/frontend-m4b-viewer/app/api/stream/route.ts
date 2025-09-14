import { NextRequest } from "next/server";
import { statSync, createReadStream } from "fs";
import { getAbsoluteSafePath } from "@/lib/path-guard";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleRequest(req, false);
}

export async function HEAD(req: NextRequest) {
  return handleRequest(req, true);
}

async function handleRequest(req: NextRequest, headOnly: boolean) {
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";
  const safe = getAbsoluteSafePath(relPath);
  if (!safe.ok) {
    return new Response("Invalid path", { status: 400 });
  }

  let stat;
  try {
    stat = statSync(safe.path);
    if (!stat.isFile()) return new Response("Not a file", { status: 404 });
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const total = stat.size;
  const rangeHeader = req.headers.get("range");
  const range = parseRange(rangeHeader, total);

  const headers = new Headers();
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Type", "audio/mp4");

  if (!range) {
    headers.set("Content-Length", String(total));
    if (headOnly) return new Response(null, { status: 200, headers });
    const stream = createReadStream(safe.path);
    return new Response(stream as any, { status: 200, headers });
  }

  if (range.invalid) {
    headers.set("Content-Range", `bytes */${total}`);
    return new Response("Invalid Range", { status: 416, headers });
  }

  const { start, end } = range;
  const chunkSize = end - start + 1;
  headers.set("Content-Range", `bytes ${start}-${end}/${total}`);
  headers.set("Content-Length", String(chunkSize));

  if (headOnly) return new Response(null, { status: 206, headers });

  const stream = createReadStream(safe.path, { start, end });
  return new Response(stream as any, { status: 206, headers });
}

