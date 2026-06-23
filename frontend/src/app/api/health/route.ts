import { NextResponse } from "next/server";
import { pool } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let db = "down";
  try {
    await pool.query("SELECT 1");
    db = "up";
  } catch {
    db = "down";
  }
  return NextResponse.json({
    status: "ok",
    service: "teamff",
    db,
    timestamp: new Date().toISOString(),
  });
}
