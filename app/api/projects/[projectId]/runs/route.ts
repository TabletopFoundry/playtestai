import { NextResponse } from "next/server";
import { createSimulationRun } from "@/lib/db";
import { getProjectById } from "@/lib/db/projects";
import { CreateRunInputSchema, formatZodErrors } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CreateRunInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: `Invalid run data: ${formatZodErrors(parsed.error)}` }, { status: 400 });
  }

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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const project = getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}
