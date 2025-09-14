import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listDirectory } from "@/lib/fs-helpers";

const schema = z.object({ path: z.string().optional().default("") });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parse = schema.safeParse({ path: searchParams.get("path") ?? "" });
  if (!parse.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const res = await listDirectory(parse.data.path);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 400 });
  }
}

