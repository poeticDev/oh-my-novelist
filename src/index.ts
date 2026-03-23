import type { Plugin, PluginInput, Hooks } from "@opencode-ai/plugin";
import type { Part, TextPart } from "@opencode-ai/sdk";
import { loadState, saveState, setCurrentProject, getProjectState } from "./utils/state.js";
import type { ProjectState } from "./utils/state.js";

import { DirectorAgent } from "./agents/director.js";
import { ConceptAgent } from "./agents/concept.js";
import { WorldBuilderAgent } from "./agents/world-builder.js";
import { CharacterAgent } from "./agents/character.js";
import { PlotAgent } from "./agents/plot.js";
import { SceneAgent } from "./agents/scene.js";
import { DialogueAgent } from "./agents/dialogue.js";
import { CriticAgent } from "./agents/critic.js";
import { EditorAgent } from "./agents/editor.js";

import { TodoManagerTool } from "./tools/todo-manager.js";

function getTextFromParts(parts: Part[]): string {
  return parts
    .filter((part): part is TextPart => part.type === "text")
    .map(part => part.text)
    .join("");
}

function resolveActiveProject(state: { currentProject: string | null }): string | null {
  return state.currentProject;
}

function getProjectStateOrNull(directory: string, projectName: string | null): ProjectState | null {
  if (!projectName) return null;
  return getProjectState(directory, projectName);
}

const ohMyNovelist: Plugin = async (input: PluginInput): Promise<Hooks> => {
  const { directory } = input;
  
  const state = loadState(directory);
  let currentProject = state.currentProject;
  
  const agents = {
    director: new DirectorAgent(),
    concept: new ConceptAgent(),
    worldBuilder: new WorldBuilderAgent(),
    character: new CharacterAgent(),
    plot: new PlotAgent(),
    scene: new SceneAgent(),
    dialogue: new DialogueAgent(),
    critic: new CriticAgent(),
    editor: new EditorAgent(),
  };
  
  const todoManager = new TodoManagerTool(directory);
  
  return {
    tool: {
      novelist_todo: {
        description: "Manage novel project todos - create, list, update, and track progress",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["create", "list", "update", "progress"],
              description: "Action to perform on todos",
            },
            projectName: {
              type: "string",
              description: "Project name (optional, uses current project if not provided)",
            },
            todoId: {
              type: "string",
              description: "Todo ID (required for update action)",
            },
            status: {
              type: "string",
              enum: ["pending", "in_progress", "completed", "cancelled"],
              description: "New status (required for update action)",
            },
            force: {
              type: "boolean",
              description: "Force recreate todos even if they exist (for create action)",
            },
          },
          required: ["action"],
        },
        execute: async (args: {
          action: string;
          projectName?: string;
          todoId?: string;
          status?: string;
          force?: boolean;
        }) => {
          const project = args.projectName || currentProject;
          if (!project) {
            return {
              success: false,
              error: "No project specified. Either provide projectName or set a current project first.",
            };
          }

          switch (args.action) {
            case "create":
              return todoManager.createTodos(project, args.force);
            case "list":
              return todoManager.listTodos(project);
            case "update":
              return todoManager.updateTodo(project, args.todoId, args.status);
            case "progress":
              return todoManager.getProgress(project);
            default:
              return {
                success: false,
                error: `Unknown action: ${args.action}`,
              };
          }
        },
      },
    },

    "chat.message": async (input, output) => {
      const message = output.message;
      const content = getTextFromParts(output.parts);
      
      const activeProject = resolveActiveProject(state);
      const projectState = getProjectStateOrNull(directory, activeProject);
      
      const response = await agents.director.handle(
        content, 
        activeProject, 
        agents,
        todoManager,
        projectState
      );

      output.parts.push({
        id: "prt-" + Date.now() + "-" + output.parts.length,
        sessionID: message.sessionID,
        messageID: message.id,
        type: "text" as const,
        text: response,
      });
    },
    
    event: async ({ event }) => {
      if (event.type === "session.created") {
        console.log("Oh My Novelist: Session started");
      }
    },
    
    config: async () => {
    },
  };
};

export default ohMyNovelist;
