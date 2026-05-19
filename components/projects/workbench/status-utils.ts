import type { GameProject, GameVersion, ValidationIssue } from "@/lib/types";

export type WorkspaceStatusTone = "danger" | "warn" | "ready" | "accent";

export function countValidationIssues(issues: ValidationIssue[]) {
  return {
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
  };
}

export function getVersionStateLabel(version: Pick<GameVersion, "published"> | null | undefined) {
  return version?.published ? "Published" : "Draft";
}

export function getWorkspaceStatusSummary({
  version,
  issues,
  selectedRun,
  dirty,
}: {
  version: GameVersion | null;
  issues: ValidationIssue[];
  selectedRun: GameProject["runs"][number] | null;
  dirty: boolean;
}): { tone: WorkspaceStatusTone; title: string; description: string } {
  if (!version) {
    return {
      tone: "warn",
      title: "No active ruleset selected",
      description: "Select a version or create a new snapshot before editing and running simulations.",
    };
  }

  const { errors, warnings } = countValidationIssues(issues);

  if (errors > 0) {
    return {
      tone: "danger",
      title: `${errors} blocker${errors === 1 ? "" : "s"} stopping simulations`,
      description:
        warnings > 0
          ? `${version.label} also has ${warnings} warning${warnings === 1 ? "" : "s"}. Fix blockers in Rule definition before running.`
          : `Fix the Rule definition blockers for ${version.label} before running or publishing.`,
    };
  }

  if (dirty) {
    return {
      tone: "warn",
      title: `${version.label} has unsaved changes`,
      description: "Save or wait for autosave before snapshotting, publishing, or using this version as your next simulation baseline.",
    };
  }

  if (selectedRun && selectedRun.versionId === version.id) {
    return {
      tone: "accent",
      title: `${version.label} has a current benchmark`,
      description:
        warnings > 0
          ? `Latest run: ${selectedRun.label}. ${warnings} warning${warnings === 1 ? " remains" : "s remain"} in the ruleset.`
          : `Latest run: ${selectedRun.label}. No blockers are preventing another benchmark.`,
    };
  }

  return {
    tone: "ready",
    title: `${version.label} is ready to simulate`,
    description:
      warnings > 0
        ? `${warnings} warning${warnings === 1 ? " is" : "s are"} still worth reviewing, but there are no blocking issues.`
        : "No blocking issues detected. You can run a simulation, snapshot the version, or export the latest results.",
  };
}
