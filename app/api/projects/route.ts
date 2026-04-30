import { NextResponse } from "next/server";
import { createProject, getProjectsSummary } from "@/lib/db";
import { CreateProjectInputSchema } from "@/lib/validation";
import { parseJsonBody, validationError, withApiErrorHandling } from "@/lib/api-helpers";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async () => {
  return NextResponse.json({ projects: getProjectsSummary() });
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const body = await parseJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = CreateProjectInputSchema.safeParse(body.data);
  if (!parsed.success) return validationError("Invalid project data", parsed.error);

  const project = createProject({
    name: parsed.data.name,
    description: parsed.data.description,
    playerCountMin: parsed.data.playerCountMin,
    playerCountMax: parsed.data.playerCountMax,
    winConditionType: parsed.data.winConditionType,
  });

  return NextResponse.json({ projectId: project.id }, { status: 201 });
});
