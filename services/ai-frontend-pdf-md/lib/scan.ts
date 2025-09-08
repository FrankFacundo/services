import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { getDocsRoot, toPosixRelative } from './paths';
import type { DocSummary, DocWithContent } from './types';

type ManifestItem = { id?: string; pdf: string; md: string };

async function exists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJsonSafe<T>(p: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) await walk(abs, out);
    else out.push(abs);
  }
  return out;
}

function titleFromId(id: string): string {
  const base = id.split('/').pop() || id;
  return base.replace(/[-_]/g, ' ');
}

export async function listDocs(): Promise<DocSummary[]> {
  const root = getDocsRoot();
  const manifestPath = path.join(root, 'manifest.json');
  if (fssync.existsSync(manifestPath)) {
    const manifest = await readJsonSafe<ManifestItem[]>(manifestPath);
    if (!manifest) throw new Error('Invalid manifest.json');
    const docs: DocSummary[] = [];
    for (const item of manifest) {
      // treat paths as POSIX relative
      const pdfAbs = path.resolve(root, item.pdf.split('/').join(path.sep));
      const mdAbs = path.resolve(root, item.md.split('/').join(path.sep));
      if (!fssync.existsSync(pdfAbs) || !fssync.existsSync(mdAbs)) continue;
      const id = (item.id && item.id.trim()) || toPosixRelative(root, mdAbs).replace(/\.(md|markdown)$/i, '');
      docs.push({
        id,
        title: titleFromId(id),
        pdfRel: toPosixRelative(root, pdfAbs),
        mdRel: toPosixRelative(root, mdAbs),
      });
    }
    return docs;
  }

  // Scan filesystem and match by directory + basename
  const files = await walk(root);
  const map = new Map<string, { pdf?: string; md?: string }>();
  for (const f of files) {
    const rel = toPosixRelative(root, f);
    const ext = path.extname(rel).toLowerCase();
    if (!['.pdf', '.md', '.markdown'].includes(ext)) continue;
    const dir = path.posix.dirname(rel);
    const base = path.posix.basename(rel, ext);
    const key = path.posix.join(dir, base);
    const rec = map.get(key) || {};
    if (ext === '.pdf') rec.pdf = rel;
    else rec.md = rel;
    map.set(key, rec);
  }
  const out: DocSummary[] = [];
  for (const [key, rec] of map.entries()) {
    if (!rec.pdf || !rec.md) continue; // require both
    const id = key; // already POSIX
    out.push({ id, title: titleFromId(id), pdfRel: rec.pdf, mdRel: rec.md });
  }
  // stable sort alphabetically by title
  out.sort((a, b) => a.title.localeCompare(b.title));
  return out;
}

export async function getDocWithContent(id: string): Promise<DocWithContent | null> {
  const docs = await listDocs();
  const target = docs.find((d) => d.id === id);
  if (!target) return null;
  const root = getDocsRoot();
  const mdAbs = path.resolve(root, target.mdRel.split('/').join(path.sep));
  const mdContent = await fs.readFile(mdAbs, 'utf8');
  return { ...target, mdContent };
}
