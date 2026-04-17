import { NextResponse } from "next/server";
import { deleteSimulationRun } from "@/lib/db";
import { getProjectById } from "@/lib/db/projects";

export const runtime = "nodejs";

export async function DELETE(_: Request, context: { params: Promise<{ projectId: string; runId: string }> }) {
  const { projectId, runId } = await context.params;
  deleteSimulationRun(projectId, runId);

  const project = getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}
