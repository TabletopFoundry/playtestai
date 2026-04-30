"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { validateVersionPlayable } from "@/lib/simulation/engine";
import type { GameProject, GameVersion } from "@/lib/types";
import { deepClone, stringifyStats } from "@/lib/utils";
import type { ActiveTab, WorkbenchState } from "./workbench/types";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";

export function useWorkbenchState(initialProject: GameProject): WorkbenchState {
  const initialVersion = initialProject.versions[0] ?? null;
  const initialStatsInput = initialVersion
    ? Object.fromEntries(initialVersion.cards.map((card) => [card.id, stringifyStats(card.stats)]))
    : {};

  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [selectedVersionId, setSelectedVersionId] = useState(initialVersion?.id ?? "");
  const [selectedRunId, setSelectedRunId] = useState(initialProject.runs[0]?.id ?? "");

  // Refs to avoid stale closures in updateFromResponse when concurrent calls overlap
  const selectedRunIdRef = useRef(selectedRunId);
  const selectedVersionIdRef = useRef(selectedVersionId);
  useEffect(() => {
    selectedRunIdRef.current = selectedRunId;
    selectedVersionIdRef.current = selectedVersionId;
  });
  const [workingVersion, setWorkingVersion] = useState<GameVersion | null>(initialVersion ? deepClone(initialVersion) : null);
  const [projectDraft, setProjectDraft] = useState({ name: initialProject.name, description: initialProject.description });
  const [cardStatsInput, setCardStatsInput] = useState<Record<string, string>>(initialStatsInput);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);

  const selectedVersion = useMemo(
    () => project.versions.find((version) => version.id === selectedVersionId) ?? project.versions[0] ?? null,
    [project.versions, selectedVersionId],
  );
  const selectedRun = useMemo(
    () => project.runs.find((run) => run.id === selectedRunId) ?? project.runs[0] ?? null,
    [project.runs, selectedRunId],
  );
  const versionValidation = useMemo(() => (workingVersion ? validateVersionPlayable(workingVersion) : []), [workingVersion]);
  const dirty = useMemo(() => {
    if (!workingVersion || !selectedVersion) return false;
    return JSON.stringify(workingVersion) !== JSON.stringify(selectedVersion);
  }, [selectedVersion, workingVersion]);

  const syncVersionSelection = useCallback(
    (nextProject: GameProject, versionId: string) => {
      const nextVersion = nextProject.versions.find((version) => version.id === versionId) ?? nextProject.versions[0] ?? null;
      if (!nextVersion) return;

      const clone = deepClone(nextVersion);
      setSelectedVersionId(nextVersion.id);
      setWorkingVersion(clone);
      setCardStatsInput(Object.fromEntries(clone.cards.map((card) => [card.id, stringifyStats(card.stats)])));
    },
    [],
  );

  const updateFromResponse = useCallback(
    async (response: Response, options?: { versionId?: string; keepStatus?: boolean }) => {
      const payload = (await response.json()) as { project?: GameProject; error?: string; versionId?: string };
      if (!response.ok || !payload.project) {
        throw new Error(payload.error ?? "Unexpected API error.");
      }

      setProject(payload.project);
      setProjectDraft({ name: payload.project.name, description: payload.project.description });

      const nextRunId = payload.project.runs.find((run) => run.id === selectedRunIdRef.current)?.id ?? payload.project.runs[0]?.id ?? "";
      setSelectedRunId(nextRunId);

      const nextVersionId = options?.versionId ?? payload.versionId;
      if (nextVersionId) {
        selectedVersionIdRef.current = nextVersionId;
        syncVersionSelection(payload.project, nextVersionId);
      } else if (!payload.project.versions.find((version) => version.id === selectedVersionIdRef.current) && payload.project.versions[0]) {
        selectedVersionIdRef.current = payload.project.versions[0].id;
        syncVersionSelection(payload.project, payload.project.versions[0].id);
      }

      if (!options?.keepStatus) {
        setErrorMessage(null);
      }
      return payload.project;
    },
    [syncVersionSelection],
  );

  const handleSaveProject = useCallback(async () => {
    setSavingProject(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectDraft),
      });
      await updateFromResponse(response);
      setStatusMessage("Project details saved.");
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : "Failed to save project.");
    } finally {
      setSavingProject(false);
    }
  }, [project.id, projectDraft, updateFromResponse]);

  const handleSaveVersion = useCallback(
    async (silent = false) => {
      if (!workingVersion) return null;

      setSavingVersion(true);
      if (!silent) {
        setStatusMessage(null);
        setErrorMessage(null);
      }

      try {
        const response = await fetch(`/api/projects/${project.id}/versions/${workingVersion.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(workingVersion),
        });
        const nextProject = await updateFromResponse(response, { keepStatus: silent });
        const savedVersion = nextProject.versions.find((version) => version.id === selectedVersionIdRef.current) ?? nextProject.versions[0] ?? null;
        if (!silent && savedVersion) {
          setStatusMessage(`Saved ${savedVersion.label}.`);
        }
        return savedVersion;
      } catch (caught) {
        setErrorMessage(caught instanceof Error ? caught.message : "Failed to save version.");
        return null;
      } finally {
        setSavingVersion(false);
      }
    },
    [project.id, workingVersion, updateFromResponse],
  );

  const handleCreateSnapshot = useCallback(async () => {
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const latestVersion = dirty ? await handleSaveVersion(true) : selectedVersion;
      const response = await fetch(`/api/projects/${project.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceVersionId: latestVersion?.id, label: `v${project.versions.length + 1}.0-snapshot` }),
      });
      const nextProject = await updateFromResponse(response);
      const newVersion = nextProject.versions[0];
      if (newVersion) {
        syncVersionSelection(nextProject, newVersion.id);
      }
      setStatusMessage("Snapshot created. Use it as Variant B or a new tuning branch.");
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : "Failed to create snapshot.");
    }
  }, [dirty, handleSaveVersion, project.id, project.versions.length, selectedVersion, syncVersionSelection, updateFromResponse]);

  // Keyboard shortcut: Cmd/Ctrl+Enter dispatches a custom event for the simulation tab
  const handleRunSimulationShortcut = useCallback(() => {
    document.dispatchEvent(new CustomEvent("playtestai:run-simulation"));
  }, []);

  const handleDismissMessages = useCallback(() => {
    setStatusMessage(null);
    setErrorMessage(null);
  }, []);

  useKeyboardShortcuts({
    onSave: () => void handleSaveVersion(),
    onRunSimulation: handleRunSimulationShortcut,
    onDismissMessages: handleDismissMessages,
    onSwitchTab: setActiveTab,
    activeTab,
  });

  return {
    project,
    setProject,
    activeTab,
    selectedVersionId,
    selectedRunId,
    setSelectedRunId,
    workingVersion,
    setWorkingVersion,
    projectDraft,
    setProjectDraft,
    statusMessage,
    setStatusMessage,
    errorMessage,
    setErrorMessage,
    selectedVersion,
    selectedRun,
    versionValidation,
    dirty,
    setActiveTab,
    syncVersionSelection,
    handleSaveVersion,
    handleSaveProject,
    handleCreateSnapshot,
    updateFromResponse,
    cardStatsInput,
    setCardStatsInput,
    savingProject,
    savingVersion,
  };
}
