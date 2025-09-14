import { statSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import mm from "music-metadata";
import { getAbsoluteSafePath } from "@/lib/path-guard";
import { formatTime } from "@/lib/time";
import type { ParsedMetadataResult, ParsedMetadata } from "@/lib/types";

export async function getMetadata(relPath: string): Promise<ParsedMetadataResult & { raw?: any }> {
  const safe = getAbsoluteSafePath(relPath);
  if (!safe.ok) return { ok: false, error: safe.error, status: 400 };

  let stat;
  try {
    stat = statSync(safe.path);
  } catch {
    return { ok: false, error: "Not found", status: 404 };
  }
  if (!stat.isFile()) return { ok: false, error: "Not a file", status: 404 };

  try {
    const metadata = await mm.parseFile(safe.path, { duration: true });
    const common = metadata.common || {};
    const format = metadata.format || {};
    let chapters = (metadata as any).chapters
      ? (metadata as any).chapters.map((ch: any) => ({ title: ch.title, start: ch.start ?? ch.startTime ?? 0 }))
      : [];

    // If no chapters detected via music-metadata, optionally use ffprobe
    if ((!chapters || chapters.length === 0) && (process.env.USE_FFPROBE || "false").toLowerCase() === "true") {
      const ffprobeChapters = await getChaptersViaFfprobe(safe.path);
      if (ffprobeChapters.length > 0) {
        chapters = ffprobeChapters;
      }
    }

    chapters = chapters.sort((a, b) => a.start - b.start);

    let coverDataUrl: string | undefined;
    const pic = common.picture?.[0];
    if (pic && pic.data) {
      const b64 = Buffer.from(pic.data).toString("base64");
      coverDataUrl = `data:${pic.format || "image/jpeg"};base64,${b64}`;
    }

    const result: ParsedMetadata = {
      ok: true,
      fileName: safe.path.split("/").pop() || relPath,
      common: {
        title: common.title,
        album: common.album,
        artist: common.artist,
        albumartist: common.albumartist,
        genre: common.genre,
        year: common.year,
      },
      format: {
        duration: format.duration,
        bitrate: format.bitrate,
        codec: format.codec,
        container: format.container,
        sampleRate: format.sampleRate,
        numberOfChannels: format.numberOfChannels,
        size: stat.size,
      },
      chapters,
      coverDataUrl,
      prettyDuration: formatTime(format.duration),
    };

    return { ...result, raw: metadata };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to parse metadata", status: 500 };
  }
}

const execFileAsync = promisify(execFile);

async function getChaptersViaFfprobe(filePath: string): Promise<{ title?: string; start: number }[]> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_chapters",
      filePath,
    ]);
    const json = JSON.parse(stdout);
    const chapters = Array.isArray(json?.chapters) ? json.chapters : [];
    return chapters.map((ch: any, idx: number) => {
      const start = ch.start_time != null ? parseFloat(ch.start_time) : (ch.start != null ? Number(ch.start) : 0);
      const title = ch.tags?.title || ch.tags?.TITLE || `Chapter ${idx + 1}`;
      return { title, start: isFinite(start) ? start : 0 };
    });
  } catch {
    return [];
  }
}
