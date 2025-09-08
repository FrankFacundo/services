// Avoid Node 'path' in client-bundled code. Implement minimal POSIX join/normalize.
function posixNormalize(p: string): string {
  const parts = p.split('/');
  const out: string[] = [];
  for (const seg of parts) {
    if (!seg || seg === '.') continue;
    if (seg === '..') { out.pop(); continue; }
    out.push(seg);
  }
  return out.join('/');
}

export type Heading = { level: number; text: string; id: string };

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function resolveImageToApi(mdRelPath: string, imgSrc: string): string {
  // imgSrc may be absolute-like or relative; only handle relative and bare
  if (/^https?:\/\//i.test(imgSrc) || imgSrc.startsWith('/')) {
    return imgSrc; // leave external and root-absolute as-is
  }
  const mdDir = mdRelPath.split('/').slice(0, -1).join('/');
  const combined = posixNormalize(`${mdDir}/${imgSrc}`);
  return `/api/file?path=${encodeURIComponent(combined)}`;
}

export function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split(/\r?\n/);
  const out: Heading[] = [];
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (m) {
      const level = m[1].length;
      const text = m[2].trim();
      const id = slugify(text);
      out.push({ level, text, id });
    }
  }
  return out;
}
