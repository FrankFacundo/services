import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStructure } from "@/lib/structure";

const schema = z.object({ path: z.string().min(1) });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  const parse = schema.safeParse({ path });
  if (!parse.success) return NextResponse.json({ error: "Invalid path" }, { status: 400 });

  try {
    const s = await getStructure(parse.data.path);
    return NextResponse.json(s);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

