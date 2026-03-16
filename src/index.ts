import type { Plugin, PluginInput, Hooks } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";
import type { Part, TextPart } from "@opencode-ai/sdk";

// Agent imports
import { DirectorAgent } from "./agents/director.js";
import { ConceptAgent } from "./agents/concept.js";
import { WorldBuilderAgent } from "./agents/world-builder.js";
import { CharacterAgent } from "./agents/character.js";
import { PlotAgent } from "./agents/plot.js";
import { SceneAgent } from "./agents/scene.js";
import { DialogueAgent } from "./agents/dialogue.js";
import { CriticAgent } from "./agents/critic.js";
import { EditorAgent } from "./agents/editor.js";

// Tool imports
import { TodoManagerTool } from "./tools/todo-manager.js";
import { ObsidianVaultTool } from "./tools/obsidian-vault.js";
import { TemplateGeneratorTool } from "./tools/template-generator.js";

// Command imports
import { NovelNewCommand } from "./commands/novel-new.js";
import { NovelContinueCommand } from "./commands/novel-continue.js";
import { NovelExportCommand } from "./commands/novel-export.js";
import { NovelTodoCommand } from "./commands/novel-todo.js";
import { NovelStatsCommand } from "./commands/novel-stats.js";

// Utils
import { IntentParser, NovelIntent } from "./utils/intent-parser.js";
import { CategoryManager, CategoryConfig } from "./utils/categories.js";

function getTextFromParts(parts: Part[]): string {
  return parts
    .filter((part): part is TextPart => part.type === "text")
    .map(part => part.text)
    .join("");
}

const ohMyNovelist: Plugin = async (input: PluginInput): Promise<Hooks> => {
  const { client, project, directory, $ } = input;
  
  // Initialize agents
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
  
  // Initialize tools
  const tools = {
    todoManager: new TodoManagerTool($),
    obsidianVault: new ObsidianVaultTool($),
    templateGenerator: new TemplateGeneratorTool($),
  };
  
  // Initialize commands
  const commands = {
    novelNew: new NovelNewCommand(tools.templateGenerator, tools.todoManager),
    novelContinue: new NovelContinueCommand(agents.director),
    novelExport: new NovelExportCommand(tools.obsidianVault),
    novelTodo: new NovelTodoCommand(tools.todoManager),
    novelStats: new NovelStatsCommand(),
  };
  
  // Initialize utilities
  const intentParser = new IntentParser();
  const categoryManager = new CategoryManager();
  
  // Track current project state
  let currentProject: string | null = null;
  
  return {
    tool: {},
    
    // Handle chat messages (Director logic)
    "chat.message": async (input, output) => {
      const message = output.message;
      const content = getTextFromParts(output.parts);
      
      // Parse intent
      const intent = intentParser.parse(content);
      
      // Route to appropriate agent
      let response: string;

      switch (intent) {
        case NovelIntent.PLANNING:
          response = await agents.concept.handle(content, currentProject);
          break;
        case NovelIntent.WORLDBUILDING:
          response = await agents.worldBuilder.handle(content, currentProject);
          break;
        case NovelIntent.CHARACTER:
          response = await agents.character.handle(content, currentProject);
          break;
        case NovelIntent.PLOTTING:
          response = await agents.plot.handle(content, currentProject);
          break;
        case NovelIntent.WRITING:
          // Determine if scene or dialogue
          if (content.includes("대화") || content.includes("대사")) {
            response = await agents.dialogue.handle(content, currentProject);
          } else {
            response = await agents.scene.handle(content, currentProject);
          }
          break;
        case NovelIntent.REVIEWING:
          response = await agents.critic.handle(content, currentProject);
          break;
        case NovelIntent.EDITING:
          response = await agents.editor.handle(content, currentProject);
          break;
        default:
          // Use Director for general conversation
          response = await agents.director.handle(content, currentProject, agents);
      }

      output.parts.push({
        id: "prt-" + Date.now() + "-" + output.parts.length,
        sessionID: message.sessionID,
        messageID: message.id,
        type: "text" as const,
        text: response,
      });
    },

    // Modify LLM parameters based on category
    "chat.params": async (input, output) => {
      // Only adjust temperature based on intent, don't override model
      const message = input.message as unknown as { summary?: { body?: string } };
      const content = message.summary?.body || "";
      const intent = intentParser.parse(content);
      const category = categoryManager.getCategory(intent);
      
      // Only apply temperature, keep other settings
      output.temperature = category.temperature;
    },
    
    // Handle tool execution
    "tool.execute.before": async (input, output) => {
      const toolName = input.tool;
      
      // Tool arguments are validated here
      switch (toolName) {
        case "novel-todo-manager":
          // Args already validated by Zod schema
          break;
        case "novel-obsidian-vault":
          // Args already validated by Zod schema
          break;
        case "novel-template-generator":
          // Args already validated by Zod schema
          break;
      }
    },
    
    // Handle tool output formatting
    "tool.execute.after": async (input, output) => {
      const toolName = input.tool;
      const result = input.args.result;
      
      output.title = `Oh My Novelist - ${toolName}`;
      output.output = JSON.stringify(result, null, 2);
      output.metadata = { tool: toolName, timestamp: Date.now() };
    },
    
    // Event handler
    event: async ({ event }) => {
      // Handle session events
      if (event.type === "session.created") {
        console.log("Oh My Novelist: Session started");
      }
    },
    
    // Config handler
    config: async (config) => {
      const cfg = config as unknown as { plugin?: Record<string, unknown> };
      const novelConfig = cfg.plugin?.["oh-my-novelist"] as { categories?: Record<string, CategoryConfig> } | undefined;
      if (novelConfig?.categories !== undefined) {
        categoryManager.updateConfig(novelConfig.categories);
      }
    },
  };
};

export default ohMyNovelist;
