import { NextResponse } from "next/server";
import { deleteProject, getProjectById, updateProject } from "@/lib/db";
import { UpdateProjectInputSchema, formatZodErrors } from "@/lib/validation";

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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = UpdateProjectInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: `Invalid project data: ${formatZodErrors(parsed.error)}` }, { status: 400 });
  }

  const project = updateProject(projectId, {
    name: parsed.data.name?.trim() ?? "Untitled project",
    description: parsed.data.description?.trim() ?? "",
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function DELETE(_: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const deleted = deleteProject(projectId);

  if (!deleted) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
