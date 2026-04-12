import { NextResponse } from "next/server";
import { createSimulationRun } from "@/lib/db";
import type { SimulationBatchResult, SimulationConfig } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const payload = (await request.json()) as {
    versionId?: string;
    label?: string;
    config?: SimulationConfig;
    result?: SimulationBatchResult;
  };

  if (!payload.versionId || !payload.config || !payload.result) {
    return NextResponse.json({ error: "versionId, config, and result are required." }, { status: 400 });
  }

  const project = createSimulationRun(
    projectId,
    payload.versionId,
    payload.label ?? `Run · ${new Date().toLocaleString()}`,
    payload.config,
    payload.result,
  );

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}
