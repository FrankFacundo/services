import { execFile } from "child_process";
import { promisify } from "util";
import { getAbsoluteSafePath } from "@/lib/path-guard";
import { getMetadata } from "@/lib/metadata";

const execFileAsync = promisify(execFile);

export async function getStructure(relPath: string): Promise<any> {
  const safe = getAbsoluteSafePath(relPath);
  if (!safe.ok) return { ok: false, error: safe.error };

  const use = (process.env.USE_FFPROBE || "false").toLowerCase() === "true";
  if (use) {
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        "-show_chapters",
        safe.path,
      ]);
      const json = JSON.parse(stdout);
      return summarizeFfprobe(json);
    } catch (e: any) {
      // fall back to metadata synthesis
    }
  }

  const meta = await getMetadata(relPath);
  if (meta.ok) {
    return {
      source: "music-metadata",
      container: meta.format.container || "mp4/m4b",
      codec: meta.format.codec,
      duration: meta.format.duration,
      bitrate: meta.format.bitrate,
      chapters: meta.chapters,
      note: "ffprobe disabled or unavailable; synthesized summary.",
    };
  }
  return { error: meta.error || "Unable to determine structure" };
}

function summarizeFfprobe(ff: any) {
  const atoms: any[] = [];
  // We don't parse atom sizes directly; provide a simplified view from streams/format
  const streams = (ff.streams || []).map((s: any) => ({
    index: s.index,
    codec_type: s.codec_type,
    codec_name: s.codec_name,
    sample_rate: s.sample_rate,
    channels: s.channels,
    bit_rate: s.bit_rate,
    duration: s.duration,
  }));
  const chapters = (ff.chapters || []).map((c: any) => ({
    id: c.id,
    start_time: c.start_time,
    end_time: c.end_time,
    tags: c.tags,
  }));

  return {
    source: "ffprobe",
    format: ff.format,
    streams,
    chapters,
    atoms,
  };
}

