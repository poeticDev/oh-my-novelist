import type { PromptScaffold, PromptVariables, BuiltPrompt, PromptBuildOptions } from "./types.js";
import { PromptLoader } from "./loader.js";

export class PromptBuilder {
  constructor(private readonly loader: PromptLoader) {}

  build(
    agentType: string,
    scaffold: PromptScaffold,
    variables: PromptVariables,
    options: PromptBuildOptions = {}
  ): BuiltPrompt {
    const agentInstructions = this.loader.load(agentType, options.family);

    const sections: string[] = [
      `# Role\n${scaffold.role}`,
      `# Objective\n${scaffold.objective}`,
      `# Context\n${scaffold.contextSections.join("\n")}`,
      `# Constraints\n${scaffold.constraints.map((c) => `- ${c}`).join("\n")}`,
      `# Output Format\n${scaffold.outputFormat}`,
    ];

    if (scaffold.tone) {
      sections.push(`# Tone\n${scaffold.tone}`);
    }

    sections.push(`# Agent Instructions\n${agentInstructions}`);

    return {
      system: sections.join("\n\n"),
      user: variables.userRequest,
    };
  }
}
