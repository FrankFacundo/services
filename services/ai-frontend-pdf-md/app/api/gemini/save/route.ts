import { NextRequest, NextResponse } from 'next/server';
import { getDocsRoot, safeJoinFromRoot } from '@/lib/paths';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as null | {
      path?: string; // original image rel path resolved against DOCS_ROOT (POSIX-like)
      mdPath?: string; // markdown rel path
      srcRef?: string; // original reference as appears in markdown
      data?: string; // base64 without data: prefix
      mimeType?: string;
    };
    if (!body?.path || !body?.mdPath || !body?.srcRef || !body?.data) {
      return NextResponse.json({ error: 'Missing path, mdPath, srcRef or data' }, { status: 400 });
    }
    const root = getDocsRoot();
    const rel = body.path;
    const absSrc = safeJoinFromRoot(root, rel);
    // Compute destination rel path under new_images sibling of images
    const segs = rel.split('/');
    let idx = -1;
    for (let i = segs.length - 1; i >= 0; i--) {
      if (segs[i] === 'images') { idx = i; break; }
    }
    let destSegs: string[];
    if (idx >= 0) {
      destSegs = segs.slice();
      destSegs[idx] = 'new_images';
    } else {
      destSegs = segs.slice(0, -1).concat(['new_images', segs[segs.length - 1]]);
    }
    const destRel = destSegs.join('/');
    const absDest = safeJoinFromRoot(root, destRel);

    await fs.mkdir(path.dirname(absDest), { recursive: true });
    const buf = Buffer.from(body.data, 'base64');
    await fs.writeFile(absDest, buf);

    // Update markdown references
    const mdAbs = safeJoinFromRoot(root, body.mdPath);
    const mdText = await fs.readFile(mdAbs, 'utf8');

    // Compute newRef in markdown
    let newRef: string;
    const srcRefSegs = body.srcRef.split('/');
    const srcIdx = srcRefSegs.lastIndexOf('images');
    if (srcIdx >= 0) {
      srcRefSegs[srcIdx] = 'new_images';
      newRef = srcRefSegs.join('/');
    } else {
      // Compute relative from md dir to destRel
      const mdDirRel = body.mdPath.split('/').slice(0, -1).join('/');
      newRef = path.posix.relative(mdDirRel || '.', destRel);
    }

    const nextMd = mdText.split(body.srcRef).join(newRef);
    if (nextMd !== mdText) {
      await fs.writeFile(mdAbs, nextMd, 'utf8');
    }

    return NextResponse.json({ ok: true, destRel, newRef });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save image' }, { status: 500 });
  }
}

