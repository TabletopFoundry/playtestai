import { NextResponse } from "next/server";
import { deleteSimulationRun } from "@/lib/db";
import { getProjectById } from "@/lib/db/projects";
import { notFound, withApiErrorHandling } from "@/lib/api-helpers";

export const runtime = "nodejs";

export const DELETE = withApiErrorHandling(async (_: Request, context: { params: Promise<{ projectId: string; runId: string }> }) => {
  const { projectId, runId } = await context.params;
  const deleted = deleteSimulationRun(projectId, runId);
  if (deleted === "not-found") return notFound("Simulation run");

  const project = getProjectById(projectId);
  if (!project) return notFound("Project");

  return NextResponse.json({ project });
});
