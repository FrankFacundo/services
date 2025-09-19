import { NextRequest, NextResponse } from "next/server";
import { getAbsoluteSafePath } from "@/lib/path-guard";
import { getMetadata } from "@/lib/metadata";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type WhisperVerboseWord = { word: string; start: number; end: number };
type WhisperVerboseSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
};
type WhisperVerbose = {
  text: string;
  words?: WhisperVerboseWord[];
  segments?: WhisperVerboseSegment[];
};

function ensureEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return apiKey;
}

async function ffmpegSliceToMp3(
  srcPath: string,
  startSec: number,
  durationSec: number,
  outPath: string
) {
  // -accurate_seek with -ss before -i is fast; for precision for small windows, we can do -ss after -i
  const args = [
    "-hide_banner",
    "-v",
    "error",
    "-ss",
    String(startSec),
    "-t",
    String(durationSec),
    "-i",
    srcPath,
    "-ac",
    "1",
    "-ar",
    "16000",
    "-vn",
    "-f",
    "mp3",
    outPath,
  ];
  await execFileAsync("ffmpeg", args);
}

async function callWhisperVerbose(
  buffer: Buffer,
  filename: string,
  apiKey: string
): Promise<WhisperVerbose> {
  const form = new FormData();
  const blob = new Blob([buffer], { type: "audio/mpeg" });
  form.append("file", blob, filename);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  // Array fields in multipart: use bracket syntax accepted by OpenAI REST
  form.append("timestamp_granularities[]", "segment");

  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${txt}`);
  }
  const json = (await resp.json()) as WhisperVerbose;
  return json;
}

function mergeWithOffset(
  acc: {
    text: string;
    words: WhisperVerboseWord[];
    segments: WhisperVerboseSegment[];
  },
  part: WhisperVerbose,
  offset: number
) {
  const words = (part.words || []).map((w, i) => ({
    ...w,
    start: (w.start ?? 0) + offset,
    end: (w.end ?? 0) + offset,
  }));
  const segs = (part.segments || []).map((s) => ({
    ...s,
    start: (s.start ?? 0) + offset,
    end: (s.end ?? 0) + offset,
  }));
  return {
    text: acc.text + (acc.text ? " " : "") + (part.text || "").trim(),
    words: acc.words.concat(words),
    segments: acc.segments.concat(segs),
  };
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

function getTranscriptPaths(absFile: string, chapterIdx: number) {
  const dir = path.dirname(absFile);
  const base = path.basename(absFile);
  const sttDir = path.join(dir, ".stt", base);
  const chapterJson = path.join(sttDir, `chapter-${chapterIdx}.json`);
  return { sttDir, chapterJson };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";
  const chapterStr = searchParams.get("chapter");
  if (!relPath || chapterStr == null)
    return NextResponse.json(
      { error: "Missing path or chapter" },
      { status: 400 }
    );
  const chapIdx = parseInt(chapterStr, 10);
  if (Number.isNaN(chapIdx))
    return NextResponse.json({ error: "Invalid chapter" }, { status: 400 });
  const safe = getAbsoluteSafePath(relPath);
  if (!safe.ok)
    return NextResponse.json({ error: safe.error }, { status: 400 });
  const { chapterJson } = getTranscriptPaths(safe.path, chapIdx);
  try {
    const content = await fs.readFile(chapterJson, "utf8");
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ exists: false }, { status: 404 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = ensureEnv();
    const body = await req.json();
    const relPath = String(body.path || "");
    const chapterIdx = Number(body.chapter);
    const force = Boolean(body.force);
    if (!relPath || !Number.isFinite(chapterIdx))
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const safe = getAbsoluteSafePath(relPath);
    if (!safe.ok)
      return NextResponse.json({ error: safe.error }, { status: 400 });

    const meta = await getMetadata(relPath);
    if (!meta.ok)
      return NextResponse.json(
        { error: meta.error },
        { status: meta.status || 500 }
      );

    const chapters = meta.chapters || [];
    if (chapterIdx < 0 || chapterIdx >= chapters.length)
      return NextResponse.json(
        { error: "Chapter out of range" },
        { status: 400 }
      );
    const start = chapters[chapterIdx].start;
    const end =
      chapterIdx + 1 < chapters.length
        ? chapters[chapterIdx + 1].start
        : meta.format.duration || 0;
    const totalDuration = Math.max(0, end - start);
    if (!Number.isFinite(totalDuration) || totalDuration <= 0)
      return NextResponse.json(
        { error: "Invalid chapter duration" },
        { status: 400 }
      );

    const { sttDir, chapterJson } = getTranscriptPaths(safe.path, chapterIdx);
    await ensureDir(sttDir);
    if (!force && fsSync.existsSync(chapterJson)) {
      const existing = await fs.readFile(chapterJson, "utf8");
      return NextResponse.json(JSON.parse(existing));
    }

    // chunk size 10 minutes
    const maxChunk = 10 * 60; // seconds
    const chunks: { offset: number; duration: number }[] = [];
    for (let offset = 0; offset < totalDuration - 0.001; offset += maxChunk) {
      const remaining = totalDuration - offset;
      chunks.push({ offset, duration: Math.min(maxChunk, remaining) });
    }

    const acc = {
      text: "",
      words: [] as WhisperVerboseWord[],
      segments: [] as WhisperVerboseSegment[],
    };
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "stt-"));
    try {
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const tmpOut = path.join(tmpDir, `chunk-${i}.mp3`);
        // Ensure ffmpeg present
        try {
          await ffmpegSliceToMp3(
            safe.path,
            start + c.offset,
            c.duration,
            tmpOut
          );
        } catch (e: any) {
          const msg = e?.message || String(e);
          return NextResponse.json(
            { error: `ffmpeg failed: ${msg}` },
            { status: 500 }
          );
        }
        const buf = await fs.readFile(tmpOut);
        const part = await callWhisperVerbose(
          buf,
          path.basename(tmpOut),
          apiKey
        );
        const offsetAbs = start + c.offset;
        const merged = mergeWithOffset(acc, part, offsetAbs);
        acc.text = merged.text;
        acc.words = merged.words;
        acc.segments = merged.segments;
      }
    } finally {
      // best effort cleanup
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {}
    }

    const out = {
      source: "whisper-1",
      chapterIndex: chapterIdx,
      start,
      end,
      duration: totalDuration,
      text: acc.text,
      words: acc.words,
      segments: acc.segments,
      createdAt: new Date().toISOString(),
    };
    await fs.writeFile(chapterJson, JSON.stringify(out, null, 2), "utf8");
    return NextResponse.json(out);
  } catch (e: any) {
    const msg = e?.message || "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
