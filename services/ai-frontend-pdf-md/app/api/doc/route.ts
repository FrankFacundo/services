import { NextRequest, NextResponse } from 'next/server';
import { getDocWithContent, listDocs } from '@/lib/scan';
import { getDocsRoot, safeJoinFromRoot } from '@/lib/paths';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    const doc = await getDocWithContent(id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as { id?: string; path?: string; content?: string } | null;
    if (!body || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }
    const root = getDocsRoot();
    let mdRel: string | null = null;
    if (body.path) {
      mdRel = body.path;
    } else if (body.id) {
      const docs = await listDocs();
      const d = docs.find((x) => x.id === body.id);
      if (!d) return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
      mdRel = d.mdRel;
    } else {
      return NextResponse.json({ error: 'Missing id or path' }, { status: 400 });
    }

    const abs = safeJoinFromRoot(root, mdRel);
    // Ensure target exists and is markdown file
    const ext = path.extname(abs).toLowerCase();
    if (!['.md', '.markdown'].includes(ext)) {
      return NextResponse.json({ error: 'Not a markdown file' }, { status: 400 });
    }
    await fs.writeFile(abs, body.content, 'utf8');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to save' }, { status: 500 });
  }
}
