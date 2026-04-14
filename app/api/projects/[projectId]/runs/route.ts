import { NextResponse } from "next/server";
import { createSimulationRun } from "@/lib/db";
import { CreateRunInputSchema, formatZodErrors } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;

  const raw = await request.json();
  const parsed = CreateRunInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: `Invalid run data: ${formatZodErrors(parsed.error)}` }, { status: 400 });
  }

  const { versionId, label, config, result } = parsed.data;

  const project = createSimulationRun(
    projectId,
    versionId,
    label ?? `Run · ${new Date().toLocaleString()}`,
    config,
    result,
  );

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}
