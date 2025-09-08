import { NextResponse } from 'next/server';
import { listDocs } from '@/lib/scan';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const docs = await listDocs();
    return NextResponse.json(docs);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to list docs' }, { status: 500 });
  }
}

