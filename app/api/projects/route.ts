import { NextResponse } from "next/server";
import { createProject, getProjectsSummary } from "@/lib/db";
import { CreateProjectInputSchema, formatZodErrors } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ projects: getProjectsSummary() });
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CreateProjectInputSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: `Invalid project data: ${formatZodErrors(parsed.error)}` }, { status: 400 });
  }

  const project = createProject({
    name: parsed.data.name,
    description: parsed.data.description,
    playerCountMin: parsed.data.playerCountMin,
    playerCountMax: parsed.data.playerCountMax,
    winConditionType: parsed.data.winConditionType,
  });

  return NextResponse.json({ projectId: project.id });
}
