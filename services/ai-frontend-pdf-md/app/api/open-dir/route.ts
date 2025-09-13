import { NextRequest, NextResponse } from 'next/server';
import { getDocsRoot, safeJoinFromRoot } from '@/lib/paths';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import { spawn } from 'child_process';

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
    if (!s) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const dirAbs = s.isDirectory() ? abs : path.dirname(abs);
    // Validate directory exists
    const ds = await stat(dirAbs).catch(() => null);
    if (!ds || !ds.isDirectory()) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }

    // Open the directory in the OS file manager
    const platform = process.platform;
    let cmd = '';
    let args: string[] = [];
    if (platform === 'darwin') {
      cmd = 'open';
      args = [dirAbs];
    } else if (platform === 'win32') {
      cmd = 'explorer.exe';
      args = [dirAbs];
    } else {
      // Assume Linux or other Unix
      cmd = 'xdg-open';
      args = [dirAbs];
    }

    try {
      const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
      // Don't wait; detach so the API responds immediately.
      child.unref();
    } catch (e: any) {
      return NextResponse.json({ error: `Failed to open folder: ${e?.message || 'spawn error'}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

