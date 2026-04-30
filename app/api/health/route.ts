import { NextResponse } from "next/server";
import { version } from "@/package.json";
import { withApiErrorHandling } from "@/lib/api-helpers";

export const runtime = "nodejs";

/**
 * Health check endpoint for monitoring and readiness probes.
 *
 * Returns the application version and current server timestamp.
 */
export const GET = withApiErrorHandling(async () => {
  return NextResponse.json({
    status: "ok",
    version,
    timestamp: new Date().toISOString(),
  });
});
