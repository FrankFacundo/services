import { NextRequest, NextResponse } from "next/server";
import { getAbsoluteSafePath } from "@/lib/path-guard";
import { promises as fs } from "fs";
import path from "path";
import { translateBatch } from "@/lib/googleTranslate";

type Segment = {
  id?: number;
  start?: number;
  end?: number;
  text?: string;
};

type TranscriptFile = {
  chapterIndex: number;
  start: number;
  end: number;
  segments?: Segment[];
  text?: string;
};

type TranslationSegment = {
  start: number;
  end: number;
  text: string;
  originalText: string;
};

type TranslationFile = {
  source: string;
  chapterIndex: number;
  targetLanguage: string;
  createdAt: string;
  detectedSourceLanguage?: string | null;
  segments: TranslationSegment[];
};

function getPaths(absFile: string, chapterIdx: number, lang?: string) {
  const dir = path.dirname(absFile);
  const base = path.basename(absFile);
  const sttDir = path.join(dir, ".stt", base);
  const transcriptPath = path.join(sttDir, `chapter-${chapterIdx}.json`);
  const translationPath = lang
    ? path.join(sttDir, `chapter-${chapterIdx}.translation-${lang}.json`)
    : undefined;
  return { sttDir, transcriptPath, translationPath };
}

function normalizeLanguage(code: string) {
  const trimmed = code.trim().toLowerCase();
  if (!trimmed) return null;
  const safe = trimmed.replace(/[^a-z0-9-]/g, "");
  return safe || null;
}

async function readTranscript(transcriptPath: string): Promise<TranscriptFile> {
  const content = await fs.readFile(transcriptPath, "utf8");
  return JSON.parse(content) as TranscriptFile;
}

function buildSegments(source: TranscriptFile) {
  if (source.segments && source.segments.length > 0) {
    return source.segments.map((seg, idx) => ({
      id: seg.id ?? idx,
      start: seg.start ?? source.start,
      end: seg.end ?? source.end,
      text: seg.text ?? "",
    }));
  }
  return [
    {
      id: 0,
      start: source.start,
      end: source.end,
      text: source.text || "",
    },
  ];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";
  const chapterStr = searchParams.get("chapter");
  const lang = searchParams.get("lang") || "";
  const normalizedLang = normalizeLanguage(lang);
  if (!relPath || !chapterStr || !normalizedLang) {
    return NextResponse.json({ error: "Missing path, chapter, or lang" }, { status: 400 });
  }
  const chapterIdx = Number(chapterStr);
  if (!Number.isFinite(chapterIdx)) {
    return NextResponse.json({ error: "Invalid chapter" }, { status: 400 });
  }

  const safe = getAbsoluteSafePath(relPath);
  if (!safe.ok) {
    return NextResponse.json({ error: safe.error }, { status: 400 });
  }
  const { translationPath } = getPaths(safe.path, chapterIdx, normalizedLang);
  if (!translationPath) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  try {
    const content = await fs.readFile(translationPath, "utf8");
    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    return NextResponse.json({ error: "Translation not found" }, { status: 404 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const relPath = String(body.path || "");
    const chapterIdx = Number(body.chapter);
    const targetLanguageRaw = String(body.targetLanguage || "");
    const force = Boolean(body.force);
    const sourceLanguage = typeof body.sourceLanguage === "string" && body.sourceLanguage.trim() ? body.sourceLanguage : "auto";

    const targetLanguage = normalizeLanguage(targetLanguageRaw);
    if (!relPath || !Number.isFinite(chapterIdx) || !targetLanguage) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const safe = getAbsoluteSafePath(relPath);
    if (!safe.ok) {
      return NextResponse.json({ error: safe.error }, { status: 400 });
    }

    const { sttDir, transcriptPath, translationPath } = getPaths(safe.path, chapterIdx, targetLanguage);
    if (!translationPath) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }

    let transcript: TranscriptFile;
    try {
      transcript = await readTranscript(transcriptPath);
    } catch (error) {
      return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
    }

    try {
      await fs.mkdir(sttDir, { recursive: true });
    } catch {}

    if (!force) {
      try {
        const existing = await fs.readFile(translationPath, "utf8");
        return NextResponse.json(JSON.parse(existing));
      } catch {}
    }

    const segments = buildSegments(transcript);
    const items = segments.map((seg, idx) => ({ id: String(idx), text: seg.text || "" }));

    const { items: translatedItems, detectedSourceLanguage } = await translateBatch(items, {
      targetLanguage,
      sourceLanguage,
    });

    const output: TranslationFile = {
      source: "google-translate-gtx",
      chapterIndex: chapterIdx,
      targetLanguage,
      createdAt: new Date().toISOString(),
      detectedSourceLanguage,
      segments: segments.map((seg, idx) => {
        const translated = translatedItems.find((item) => item.id === String(idx))?.translation || "";
        return {
          start: seg.start ?? transcript.start,
          end: seg.end ?? transcript.end,
          text: translated,
          originalText: seg.text || "",
        };
      }),
    };

    await fs.writeFile(translationPath, JSON.stringify(output, null, 2), "utf8");

    return NextResponse.json(output);
  } catch (error: any) {
    const msg = error?.message || "Failed to generate translation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
