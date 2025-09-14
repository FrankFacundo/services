export function parseRange(header: string | null, size: number): { start: number; end: number; invalid?: false } | { invalid: true } | null {
  if (!header) return null;
  // Example: bytes=0-1023 or bytes=500- or bytes=-500
  const match = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return { invalid: true };
  const startStr = match[1];
  const endStr = match[2];

  let start: number;
  let end: number;

  if (startStr === "" && endStr === "") return { invalid: true };

  if (startStr === "") {
    // suffix bytes: last N bytes
    const suffix = parseInt(endStr, 10);
    if (isNaN(suffix)) return { invalid: true };
    if (suffix === 0) return { invalid: true };
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = parseInt(startStr, 10);
    if (isNaN(start)) return { invalid: true };
    if (endStr === "") {
      end = size - 1;
    } else {
      end = parseInt(endStr, 10);
      if (isNaN(end)) return { invalid: true };
    }
  }

  if (start < 0 || end < 0 || start > end || start >= size) return { invalid: true };
  end = Math.min(end, size - 1);
  return { start, end };
}

