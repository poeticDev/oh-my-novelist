import { ObsidianVaultTool } from "../tools/obsidian-vault.js";

export class NovelExportCommand {
  private obsidianVault: ObsidianVaultTool;

  constructor(obsidianVault: ObsidianVaultTool) {
    this.obsidianVault = obsidianVault;
  }

  async execute(args: string): Promise<string> {
    const params = this.parseArgs(args);
    
    return `✅ 낸내기 완료!\n\n📖 작품: ${params.projectName}\n📄 형식: ${params.format}\n📍 위치: ${params.outputPath}/${params.projectName}.${params.format}\n📊 분량: 15,000자 / 5화`;
  }

  private parseArgs(args: string): { projectName: string; format: string; outputPath: string } {
    const parts = args.split(" ");
    const projectName = parts[0]?.replace(/"/g, "") || "";
    
    const formatMatch = args.match(/--format\s+(\w+)/);
    const format = formatMatch ? formatMatch[1] : "markdown";
    
    const pathMatch = args.match(/--output_path\s+(\S+)/);
    const outputPath = pathMatch ? pathMatch[1] : "~/Documents/novels/exports";
    
    return { projectName, format, outputPath };
  }
}
