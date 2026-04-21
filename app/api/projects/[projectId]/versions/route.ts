import { NextResponse } from "next/server";
import { duplicateVersion } from "@/lib/db";
import { getProjectById } from "@/lib/db/projects";
import { DuplicateVersionInputSchema } from "@/lib/validation";
import { notFound, parseJsonBody, validationError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;

  const body = await parseJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = DuplicateVersionInputSchema.safeParse(body.data);
  if (!parsed.success) return validationError("Invalid version data", parsed.error);

  duplicateVersion(projectId, parsed.data.sourceVersionId, parsed.data.label);
  const project = getProjectById(projectId);
  if (!project) return notFound("Project");

  return NextResponse.json({ project });
}
