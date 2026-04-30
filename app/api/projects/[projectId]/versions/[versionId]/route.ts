import { NextResponse } from "next/server";
import { deleteVersion, publishVersion, updateVersion } from "@/lib/db";
import { getProjectById } from "@/lib/db/projects";
import { GameVersionSchema, VersionActionSchema } from "@/lib/validation";
import { badRequest, notFound, parseJsonBody, validationError, withApiErrorHandling } from "@/lib/api-helpers";

export const runtime = "nodejs";

export const PUT = withApiErrorHandling(async (request: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) => {
  const { projectId, versionId } = await context.params;

  const body = await parseJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = GameVersionSchema.safeParse(body.data);
  if (!parsed.success) return validationError("Invalid version data", parsed.error);

  const result = updateVersion(projectId, versionId, parsed.data);
  if (result.status === "not-found") return notFound("Version");

  const project = getProjectById(projectId);
  if (!project) return notFound("Project");

  return NextResponse.json({ project, versionId: result.versionId });
});

export const PATCH = withApiErrorHandling(async (request: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) => {
  const { projectId, versionId } = await context.params;

  const body = await parseJsonBody(request);
  if ("error" in body) return body.error;

  const patchParsed = VersionActionSchema.safeParse(body.data);
  if (!patchParsed.success) return validationError("Invalid action", patchParsed.error);

  const payload = patchParsed.data;

  if (payload.action === "publish") {
    const result = publishVersion(projectId, versionId);
    if (result === "not-found") return notFound("Version");
    if (result === "already-published") return badRequest("Version is already published.");

    const project = getProjectById(projectId);
    if (!project) return notFound("Project");
    return NextResponse.json({ project });
  }

  return badRequest("Unknown action.");
});

export const DELETE = withApiErrorHandling(async (_: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) => {
  const { projectId, versionId } = await context.params;
  const deleted = deleteVersion(projectId, versionId);

  if (deleted === "last-version") {
    return badRequest("Cannot delete the only remaining version.");
  }

  if (deleted === "not-found") {
    return notFound("Version");
  }

  const project = getProjectById(projectId);
  if (!project) return notFound("Project");

  return NextResponse.json({ project });
});
