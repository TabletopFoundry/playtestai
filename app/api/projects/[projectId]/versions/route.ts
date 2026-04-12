import { NextResponse } from "next/server";
import { duplicateVersion } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const payload = (await request.json()) as { sourceVersionId?: string; label?: string };
  const project = duplicateVersion(projectId, payload.sourceVersionId, payload.label);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}
