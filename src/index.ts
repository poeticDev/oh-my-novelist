import type { Plugin, PluginInput, Hooks } from "@opencode-ai/plugin";
import type { Part, TextPart } from "@opencode-ai/sdk";
import { loadState, saveState, setCurrentProject } from "./utils/state.js";

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
    tool: {},
    
    "chat.message": async (input, output) => {
      const message = output.message;
      const content = getTextFromParts(output.parts);
      
      const response = await agents.director.handle(
        content, 
        currentProject, 
        agents,
        todoManager
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
