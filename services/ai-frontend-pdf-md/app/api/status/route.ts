import { NextRequest, NextResponse } from 'next/server';
import { listDocs } from '@/lib/scan';
import { getOrCreateStatusByMdRel, saveStatusByMdRel } from '@/lib/status';
import type { DocStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    const docs = await listDocs();
    const d = docs.find((x) => x.id === id);
    if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const status = await getOrCreateStatusByMdRel(d.mdRel);
    return NextResponse.json({ status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id: string | undefined = body?.id;
    const status: DocStatus | undefined = body?.status;
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }
    const docs = await listDocs();
    const d = docs.find((x) => x.id === id);
    if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await saveStatusByMdRel(d.mdRel, status);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to save status' }, { status: 500 });
  }
}

