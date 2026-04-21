import { NextResponse } from "next/server";
import { version } from "@/package.json";

export const runtime = "nodejs";

/**
 * Health check endpoint for monitoring and readiness probes.
 *
 * Returns the application version and current server timestamp.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version,
    timestamp: new Date().toISOString(),
  });
}
