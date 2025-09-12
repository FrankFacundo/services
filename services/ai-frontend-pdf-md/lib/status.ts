import path from 'path';
import fs from 'fs/promises';
import fssync from 'fs';
import { getDocsRoot, safeJoinFromRoot } from './paths';
import { DefaultDocStatus, DocStatus } from './types';

function statusRelPathForMd(mdRel: string): string {
  const posix = mdRel.split(path.sep).join('/');
  const dir = posix.split('/').slice(0, -1).join('/');
  const baseNoExt = posix.replace(/\.(md|markdown)$/i, '');
  const name = baseNoExt.split('/').pop()!;
  const statusName = `${name}.status.json`;
  return (dir ? `${dir}/` : '') + statusName;
}

export async function getOrCreateStatusByMdRel(mdRel: string): Promise<DocStatus> {
  const root = getDocsRoot();
  const rel = statusRelPathForMd(mdRel);
  const abs = safeJoinFromRoot(root, rel);
  if (!fssync.existsSync(abs)) {
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, JSON.stringify(DefaultDocStatus, null, 2), 'utf8');
    return { ...DefaultDocStatus };
  }
  try {
    const raw = await fs.readFile(abs, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      adsRemoved: !!parsed.adsRemoved,
      reviewQuestions: parsed.reviewQuestions ?? 'not_started',
      reviewImages: parsed.reviewImages ?? 'not_started',
    } as DocStatus;
  } catch {
    // Reset corrupted file
    await fs.writeFile(abs, JSON.stringify(DefaultDocStatus, null, 2), 'utf8');
    return { ...DefaultDocStatus };
  }
}

export async function saveStatusByMdRel(mdRel: string, status: DocStatus): Promise<void> {
  const root = getDocsRoot();
  const rel = statusRelPathForMd(mdRel);
  const abs = safeJoinFromRoot(root, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, JSON.stringify(status, null, 2), 'utf8');
}

