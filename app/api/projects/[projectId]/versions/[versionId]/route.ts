import { NextResponse } from "next/server";
import { deleteVersion, publishVersion, updateVersion } from "@/lib/db";
import { getProjectById } from "@/lib/db/projects";
import { GameVersionSchema, VersionActionSchema } from "@/lib/validation";
import { badRequest, notFound, parseJsonBody, validationError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) {
  const { projectId, versionId } = await context.params;

  const body = await parseJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = GameVersionSchema.safeParse(body.data);
  if (!parsed.success) return validationError("Invalid version data", parsed.error);

  updateVersion(projectId, versionId, parsed.data);
  const project = getProjectById(projectId);
  if (!project) return notFound("Project");

  return NextResponse.json({ project });
}

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) {
  const { projectId, versionId } = await context.params;

  const body = await parseJsonBody(request);
  if ("error" in body) return body.error;

  const patchParsed = VersionActionSchema.safeParse(body.data);
  if (!patchParsed.success) return validationError("Invalid action", patchParsed.error);

  const payload = patchParsed.data;

  if (payload.action === "publish") {
    publishVersion(projectId, versionId);
    const project = getProjectById(projectId);
    if (!project) return notFound("Project");
    return NextResponse.json({ project });
  }

  return badRequest("Unknown action.");
}

export async function DELETE(_: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) {
  const { projectId, versionId } = await context.params;
  const deleted = deleteVersion(projectId, versionId);

  if (!deleted) {
    return badRequest("Cannot delete — project not found or only one version remains.");
  }

  const project = getProjectById(projectId);
  if (!project) return notFound("Project");

  return NextResponse.json({ project });
}
