import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TopNav } from "@/components/chrome/top-nav";
import { ProjectWorkbench } from "@/components/projects/project-workbench";
import { getProjectById } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }): Promise<Metadata> {
  const { projectId } = await params;
  const project = getProjectById(projectId);
  return { title: project ? `${project.name} | PlaytestAI` : "Project | PlaytestAI" };
}

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = getProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 focus:outline-none sm:px-6 lg:px-8">
        <ProjectWorkbench initialProject={project} />
      </main>
    </div>
  );
}
