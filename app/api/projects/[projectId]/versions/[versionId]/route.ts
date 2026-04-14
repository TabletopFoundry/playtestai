import { NextResponse } from "next/server";
import { deleteVersion, publishVersion, updateVersion } from "@/lib/db";
import { GameVersionSchema, formatZodErrors } from "@/lib/validation";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) {
  const { projectId, versionId } = await context.params;

  const raw = await request.json();
  const parsed = GameVersionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: `Invalid version data: ${formatZodErrors(parsed.error)}` }, { status: 400 });
  }

  const project = updateVersion(projectId, versionId, parsed.data);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) {
  const { projectId, versionId } = await context.params;
  const payload = (await request.json()) as { action?: string };

  if (payload.action === "publish") {
    const project = publishVersion(projectId, versionId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ project });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(_: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) {
  const { projectId, versionId } = await context.params;
  const project = deleteVersion(projectId, versionId);

  if (!project) {
    return NextResponse.json({ error: "Cannot delete — project not found or only one version remains." }, { status: 400 });
  }

  return NextResponse.json({ project });
}
