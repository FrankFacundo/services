import { describe, it, expect } from "vitest";
import { getMetadata } from "@/lib/metadata";

describe("metadata", () => {
  it("rejects traversal", async () => {
    const res = await getMetadata("../secret.m4b");
    expect(res.ok).toBe(false);
  });
});

