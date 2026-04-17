import { NextResponse } from "next/server";
import { deleteVersion, publishVersion, updateVersion } from "@/lib/db";
import { getProjectById } from "@/lib/db/projects";
import { GameVersionSchema, VersionActionSchema, formatZodErrors } from "@/lib/validation";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) {
  const { projectId, versionId } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = GameVersionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: `Invalid version data: ${formatZodErrors(parsed.error)}` }, { status: 400 });
  }

  updateVersion(projectId, versionId, parsed.data);
  const project = getProjectById(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) {
  const { projectId, versionId } = await context.params;

  let rawPatch: unknown;
  try {
    rawPatch = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patchParsed = VersionActionSchema.safeParse(rawPatch);
  if (!patchParsed.success) {
    return NextResponse.json({ error: `Invalid action: ${formatZodErrors(patchParsed.error)}` }, { status: 400 });
  }

  const payload = patchParsed.data;

  if (payload.action === "publish") {
    publishVersion(projectId, versionId);
    const project = getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ project });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(_: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) {
  const { projectId, versionId } = await context.params;
  const deleted = deleteVersion(projectId, versionId);

  if (!deleted) {
    return NextResponse.json({ error: "Cannot delete — project not found or only one version remains." }, { status: 400 });
  }

  const project = getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}
