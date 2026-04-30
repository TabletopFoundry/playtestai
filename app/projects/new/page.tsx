import { TopNav } from "@/components/chrome/top-nav";
import { CreateProjectForm } from "@/components/projects/create-project-form";

export const metadata = {
  title: "New Project | PlaytestAI",
};

export default function NewProjectPage() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-12 focus:outline-none sm:px-6 lg:px-8">
        <CreateProjectForm />
      </main>
    </div>
  );
}
