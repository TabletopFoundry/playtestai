import { NextResponse } from "next/server";
import { duplicateVersion } from "@/lib/db";
import { getProjectById } from "@/lib/db/projects";
import { DuplicateVersionInputSchema } from "@/lib/validation";
import { notFound, parseJsonBody, validationError, withApiErrorHandling } from "@/lib/api-helpers";

export const runtime = "nodejs";

export const POST = withApiErrorHandling(async (request: Request, context: { params: Promise<{ projectId: string }> }) => {
  const { projectId } = await context.params;

  const body = await parseJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = DuplicateVersionInputSchema.safeParse(body.data);
  if (!parsed.success) return validationError("Invalid version data", parsed.error);

  const result = duplicateVersion(projectId, parsed.data.sourceVersionId, parsed.data.label);
  if (result === "not-found") return notFound("Project");

  const project = getProjectById(projectId);
  if (!project) return notFound("Project");

  return NextResponse.json({ project }, { status: 201 });
});
