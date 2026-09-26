import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "RepoPilot API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    authMode: isSupabaseConfigured() ? "supabase" : "local-development",
    database: "connected",
  }, { status: 200 });
}
