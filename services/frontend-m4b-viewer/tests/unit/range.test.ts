import { describe, it, expect } from "vitest";
import { parseRange } from "@/lib/range";

describe("parseRange", () => {
  it("parses full range", () => {
    const r = parseRange("bytes=0-99", 1000)!;
    if ('invalid' in r && r.invalid) throw new Error('invalid');
    expect(r.start).toBe(0);
    expect(r.end).toBe(99);
  });
  it("parses suffix", () => {
    const r = parseRange("bytes=-200", 1000)!;
    if ('invalid' in r && r.invalid) throw new Error('invalid');
    expect(r.start).toBe(800);
    expect(r.end).toBe(999);
  });
  it("parses open-ended", () => {
    const r = parseRange("bytes=200-", 1000)!;
    if ('invalid' in r && r.invalid) throw new Error('invalid');
    expect(r.start).toBe(200);
    expect(r.end).toBe(999);
  });
  it("rejects invalid", () => {
    const r = parseRange("units=0-10", 1000);
    expect(r && 'invalid' in r && r.invalid).toBe(true);
  });
});

