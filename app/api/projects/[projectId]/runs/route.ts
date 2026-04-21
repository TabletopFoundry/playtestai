import { NextResponse } from "next/server";
import { createSimulationRun } from "@/lib/db";
import { getProjectById } from "@/lib/db/projects";
import { CreateRunInputSchema } from "@/lib/validation";
import { badRequest, notFound, parseJsonBody, validationError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;

  const body = await parseJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = CreateRunInputSchema.safeParse(body.data);
  if (!parsed.success) return validationError("Invalid run data", parsed.error);

  const { versionId, label, config, result } = parsed.data;

  try {
    createSimulationRun(
      projectId,
      versionId,
      label ?? `Run · ${new Date().toLocaleString()}`,
      config,
      result,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not belong")) {
      return badRequest(error.message);
    }
    throw error;
  }

  const project = getProjectById(projectId);
  if (!project) return notFound("Project");

  return NextResponse.json({ project });
}
