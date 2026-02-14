import { NextRequest, NextResponse } from "next/server";
import { getDocsRoot, safeJoinFromRoot } from "@/lib/paths";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

function guessMime(buf: Uint8Array): string {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return "image/jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return "image/png";
  if (buf.length >= 6) {
    const s6 = Buffer.from(buf.slice(0, 6)).toString("ascii");
    if (s6 === "GIF87a" || s6 === "GIF89a") return "image/gif";
  }
  if (buf.length >= 12) {
    const riff = Buffer.from(buf.slice(0, 4)).toString("ascii");
    const webp = Buffer.from(buf.slice(8, 12)).toString("ascii");
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  }
  return "image/png";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as null | {
      path?: string;
      prompt?: string;
    };
    const rel = body?.path;
    if (!rel)
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    const prompt =
      body?.prompt ||
      "Enhance this image for clarity and readability while preserving all visible text, numbers, symbols, and map details.";

    const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!API_KEY)
      return NextResponse.json(
        { error: "GEMINI_API_KEY or GOOGLE_API_KEY not set" },
        { status: 500 }
      );

    const modelFromEnv =
      process.env.GEMINI_MODEL || "gemini-2.5-flash-image";
    const MODEL = modelFromEnv.replace(/^models\//, "");
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const root = getDocsRoot();
    const abs = safeJoinFromRoot(root, rel);
    const src = await fs.readFile(abs);
    const mimeType = guessMime(src);
    const b64 = Buffer.from(src).toString("base64");

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }, { inlineData: { mimeType, data: b64 } }],
        },
      ],
      generationConfig: {
        // Ask for image output explicitly; some models default to text-first output.
        responseModalities: ["IMAGE", "TEXT"],
      },
    } as any;

    const resp = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      let parsed: any = null;
      try {
        parsed = txt ? JSON.parse(txt) : null;
      } catch {}
      const upstreamMessage =
        parsed?.error?.message || parsed?.message || undefined;
      console.error("Gemini upstream error", {
        status: resp.status,
        model: MODEL,
        url: URL,
        upstreamMessage,
      });
      return NextResponse.json(
        {
          error: `Gemini error: ${resp.status}`,
          details: upstreamMessage || txt,
          model: MODEL,
          endpoint: URL,
        },
        { status: 502 }
      );
    }
    const data = await resp.json();

    const candidates = data?.candidates || [];
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json(
        { error: "No candidates returned from Gemini API." },
        { status: 502 }
      );
    }

    let outB64: string | null = null;
    let outMime: string | null = null;
    const textOutputs: string[] = [];
    const finishReasons: string[] = [];

    for (const cand of candidates) {
      finishReasons.push(cand?.finishReason ?? "UNKNOWN");
      const parts = cand?.content?.parts || [];
      for (const p of parts) {
        if (typeof p?.text === "string" && p.text.trim()) {
          textOutputs.push(p.text.trim());
        }
        const inline = p?.inlineData || p?.inline_data;
        if (inline?.data) {
          outB64 = inline.data;
          outMime = inline.mimeType || inline.mime_type || "image/png";
          break;
        }
      }
      if (outB64) break;
    }

    if (!outB64) {
      const details =
        textOutputs[0]?.slice(0, 500) ||
        `No inline image data. finishReason=${finishReasons.join(",")}`;
      console.warn("Gemini returned no image bytes", {
        model: MODEL,
        finishReasons,
        details,
      });
      return NextResponse.json(
        {
          error: "Gemini did not return image bytes.",
          details,
          finishReasons,
          model: MODEL,
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { mimeType: outMime, data: outB64 },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("Gemini generate route failed", {
      message: e?.message,
      stack: e?.stack,
    });
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
