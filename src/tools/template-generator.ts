import type { PluginInput } from "@opencode-ai/plugin";
import { z } from "zod";

type BunShell = PluginInput["$"];

const TemplateSchema = z.object({
  projectName: z.string(),
  template: z.enum(["default", "fantasy", "romance", "thriller"]),
  outputPath: z.string().default("~/Documents/novels"),
});

export class TemplateGeneratorTool {
  private $: BunShell;

  constructor($: BunShell) {
    this.$ = $;
  }

  getDefinition() {
    return {
      description: "템플릿 생성 도구",
      args: TemplateSchema.shape,
      execute: async (args: z.infer<typeof TemplateSchema>) => {
        return JSON.stringify({
          success: true,
          message: `프로젝트 "${args.projectName}" 생성됨`,
          template: args.template,
          files: ["README.md", "concept/logline.md", "world/setting.md"],
        });
      },
    };
  }
}
