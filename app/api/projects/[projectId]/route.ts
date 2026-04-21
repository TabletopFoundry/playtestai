import { NextResponse } from "next/server";
import { deleteProject, getProjectById, updateProject } from "@/lib/db";
import { UpdateProjectInputSchema } from "@/lib/validation";
import { notFound, parseJsonBody, validationError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const project = getProjectById(projectId);

  if (!project) return notFound("Project");

  return NextResponse.json({ project });
}

export async function PUT(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;

  const body = await parseJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = UpdateProjectInputSchema.safeParse(body.data);
  if (!parsed.success) return validationError("Invalid project data", parsed.error);

  const project = updateProject(projectId, {
    name: parsed.data.name?.trim() ?? "Untitled project",
    description: parsed.data.description?.trim() ?? "",
  });

  if (!project) return notFound("Project");

  return NextResponse.json({ project });
}

export async function DELETE(_: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const deleted = deleteProject(projectId);

  if (!deleted) return notFound("Project");

  return NextResponse.json({ success: true });
}
