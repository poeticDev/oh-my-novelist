import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

export interface ProjectState {
  name: string;
  currentPhase: string;
  lastAccessed: string;
  metadata: Record<string, unknown>;
}

export interface SessionState {
  currentProject: string | null;
  projects: Record<string, ProjectState>;
}

const STATE_FILE = ".oh-my-novelist/state.json";

export function getStatePath(baseDir: string): string {
  return join(baseDir, STATE_FILE);
}

export function loadState(baseDir: string): SessionState {
  const statePath = getStatePath(baseDir);
  
  if (!existsSync(statePath)) {
    return {
      currentProject: null,
      projects: {}
    };
  }
  
  const data = readFileSync(statePath, "utf-8");
  return JSON.parse(data) as SessionState;
}

export function saveState(baseDir: string, state: SessionState): void {
  const statePath = getStatePath(baseDir);
  const stateDir = dirname(statePath);
  
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  
  writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
}

export function getProjectState(baseDir: string, projectName: string): ProjectState | null {
  const state = loadState(baseDir);
  return state.projects[projectName] || null;
}

export function setProjectState(baseDir: string, projectName: string, projectState: ProjectState): void {
  const state = loadState(baseDir);
  state.projects[projectName] = projectState;
  saveState(baseDir, state);
}

export function setCurrentProject(baseDir: string, projectName: string | null): void {
  const state = loadState(baseDir);
  state.currentProject = projectName;
  if (projectName && !state.projects[projectName]) {
    state.projects[projectName] = {
      name: projectName,
      currentPhase: "planning",
      lastAccessed: new Date().toISOString(),
      metadata: {}
    };
  }
  saveState(baseDir, state);
}
