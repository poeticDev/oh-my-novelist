import type { PluginInput } from "@opencode-ai/plugin";
import { z } from "zod";

type BunShell = PluginInput["$"];

const ObsidianActionSchema = z.object({
  action: z.enum(["read", "write", "list"]),
  path: z.string(),
  content: z.string().optional(),
});

export class ObsidianVaultTool {
  private $: BunShell;
  private vaultPath: string;

  constructor($: BunShell) {
    this.$ = $;
    this.vaultPath = process.env.OBSIDIAN_VAULT_PATH || "~/Obsidian";
  }

  getDefinition() {
    return {
      description: "Obsidian Vault 연동 도구",
      args: ObsidianActionSchema.shape,
      execute: async (args: z.infer<typeof ObsidianActionSchema>) => {
        return JSON.stringify({ success: true, message: `Obsidian ${args.action} executed`, path: args.path });
      },
    };
  }
}
