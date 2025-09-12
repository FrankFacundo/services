import { NextRequest, NextResponse } from 'next/server';
import { getDocsRoot, safeJoinFromRoot } from '@/lib/paths';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

function guessMime(buf: Uint8Array): string {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return 'image/png';
  if (buf.length >= 6) {
    const s6 = Buffer.from(buf.slice(0, 6)).toString('ascii');
    if (s6 === 'GIF87a' || s6 === 'GIF89a') return 'image/gif';
  }
  if (buf.length >= 12) {
    const riff = Buffer.from(buf.slice(0, 4)).toString('ascii');
    const webp = Buffer.from(buf.slice(8, 12)).toString('ascii');
    if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  }
  return 'image/png';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as null | { path?: string; prompt?: string };
    const rel = body?.path;
    if (!rel) return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    const prompt = body?.prompt || 'Remove the watermark from this image and restore the background so it looks clean and uniform. Keep all the original text, numbers, symbols, and map details unchanged. Ensure the image remains sharp and clear without losing any of the original information.';

    const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!API_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY or GOOGLE_API_KEY not set' }, { status: 500 });

    const MODEL = 'gemini-2.5-flash-image-preview';
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const root = getDocsRoot();
    const abs = safeJoinFromRoot(root, rel);
    const src = await fs.readFile(abs);
    const mimeType = guessMime(src);
    const b64 = Buffer.from(src).toString('base64');

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: b64 } },
          ],
        },
      ],
    } as any;

    const resp = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      return NextResponse.json({ error: `Gemini error: ${resp.status}`, details: txt }, { status: 502 });
    }
    const data = await resp.json();

    const candidates = data?.candidates || [];
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ error: 'No candidates returned from Gemini API.' }, { status: 502 });
    }
    const cand = candidates[0];
    if (!cand?.content) {
      const finishReason = cand?.finishReason ?? 'UNKNOWN';
      return NextResponse.json({ error: `Generation failed/blocked (finishReason=${finishReason}).` }, { status: 502 });
    }
    const parts = cand.content?.parts || [];
    let outB64: string | null = null;
    let outMime: string | null = null;
    for (const p of parts) {
      if (p?.inlineData?.data) {
        outB64 = p.inlineData.data;
        outMime = p.inlineData.mimeType || 'image/png';
        break;
      }
    }
    if (!outB64) {
      return NextResponse.json({ error: 'Gemini did not return image bytes.' }, { status: 502 });
    }
    return NextResponse.json({ mimeType: outMime, data: outB64 }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

