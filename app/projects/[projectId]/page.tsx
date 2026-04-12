import { notFound } from "next/navigation";
import { TopNav } from "@/components/chrome/top-nav";
import { ProjectWorkbench } from "@/components/projects/project-workbench";
import { getProjectById } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = getProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProjectWorkbench initialProject={project} />
      </main>
    </div>
  );
}
