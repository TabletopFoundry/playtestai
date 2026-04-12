import { NextResponse } from "next/server";
import { getProjectById, updateProject } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const project = getProjectById(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PUT(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const payload = (await request.json()) as { name?: string; description?: string };
  const project = updateProject(projectId, {
    name: payload.name?.trim() ?? "Untitled project",
    description: payload.description?.trim() ?? "",
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}
