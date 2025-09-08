import { NextRequest, NextResponse } from 'next/server';
import { contentTypeForPath, safeJoinFromRoot, getDocsRoot } from '@/lib/paths';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';

const stat = promisify(fs.stat);

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rel = url.searchParams.get('path');
    if (!rel) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }
    const root = getDocsRoot();
    const abs = safeJoinFromRoot(root, rel);
    const s = await stat(abs).catch(() => null);
    if (!s || !s.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const stream = fs.createReadStream(abs);
    const headers = new Headers();
    headers.set('Content-Type', contentTypeForPath(abs));
    headers.set('Cache-Control', 'public, max-age=86400, immutable');
    headers.set('Content-Length', String(s.size));
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Content-Disposition', `inline; filename="${path.basename(abs)}"`);
    return new NextResponse(stream as any, { status: 200, headers });
  } catch (e: any) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
