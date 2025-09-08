import path from 'path';
import fs from 'fs';

export function getDocsRoot(): string {
  const root = process.env.DOCS_ROOT;
  if (!root) throw new Error('DOCS_ROOT not set');
  const abs = path.resolve(root);
  const s = fs.existsSync(abs) ? fs.statSync(abs) : null;
  if (!s || !s.isDirectory()) throw new Error(`DOCS_ROOT is not a directory: ${abs}`);
  return abs;
}

// Accepts POSIX-like relative path, rejects traversal and absolute
export function safeJoinFromRoot(rootAbs: string, relPosix: string): string {
  if (!relPosix) throw new Error('Empty path');
  if (relPosix.includes('\0')) throw new Error('Invalid path');
  if (relPosix.startsWith('/') || relPosix.startsWith('\\')) throw new Error('Absolute not allowed');
  const cleaned = relPosix.split('/').filter((seg) => seg !== '' && seg !== '.').join('/');
  const joinedPosix = cleaned;
  // Convert to system separators for resolve
  const sysRel = joinedPosix.split('/').join(path.sep);
  const abs = path.resolve(rootAbs, sysRel);
  const rel = path.relative(rootAbs, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path traversal detected');
  }
  return abs;
}

export function toPosixRelative(fromAbsRoot: string, fileAbs: string): string {
  const rel = path.relative(fromAbsRoot, fileAbs);
  return rel.split(path.sep).join('/');
}

export function contentTypeForPath(p: string): string {
  const ext = path.extname(p).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.md':
    case '.markdown':
      return 'text/markdown; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}
