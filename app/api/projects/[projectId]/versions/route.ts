import { NextResponse } from "next/server";
import { duplicateVersion } from "@/lib/db";
import { getProjectById } from "@/lib/db/projects";
import { DuplicateVersionInputSchema, formatZodErrors } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = DuplicateVersionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: `Invalid version data: ${formatZodErrors(parsed.error)}` }, { status: 400 });
  }

  duplicateVersion(projectId, parsed.data.sourceVersionId, parsed.data.label);
  const project = getProjectById(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}
