import { NextResponse } from "next/server";
import { createProject, getProjectsSummary } from "@/lib/db";
import type { CreateProjectInput } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ projects: getProjectsSummary() });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<CreateProjectInput>;

  if (!payload.name?.trim()) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }

  const project = createProject({
    name: payload.name,
    description: payload.description?.trim() ?? "",
    playerCountMin: Number(payload.playerCountMin ?? 2),
    playerCountMax: Number(payload.playerCountMax ?? 4),
    winConditionType: payload.winConditionType ?? "highest_score",
  });

  return NextResponse.json({ projectId: project.id });
}
