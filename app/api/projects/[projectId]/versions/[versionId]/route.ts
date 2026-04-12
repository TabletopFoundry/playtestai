import { NextResponse } from "next/server";
import { updateVersion } from "@/lib/db";
import type { GameVersion } from "@/lib/types";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) {
  const { projectId, versionId } = await context.params;
  const payload = (await request.json()) as GameVersion;
  const project = updateVersion(projectId, versionId, payload);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}
