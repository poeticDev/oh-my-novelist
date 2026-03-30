import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

function getPromptsDirectory(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const srcPath = join(__dirname, "..", "agents", "prompts");
  if (existsSync(srcPath)) {
    return srcPath;
  }

  const distPath = join(__dirname, "..", "..", "agents", "prompts");
  if (existsSync(distPath)) {
    return distPath;
  }

  return srcPath;
}

export class PromptLoader {
  private promptsDir: string;
  private cache: Map<string, string>;

  constructor(promptsDir?: string) {
    this.promptsDir = promptsDir ?? getPromptsDirectory();
    this.cache = new Map();
  }

  /**
   * Convert camelCase agentType to kebab-case filename.
   * worldBuilder -> world-builder
   * director -> director (already kebab-case)
   */
  private getPromptFilename(agentType: string): string {
    return agentType.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }

  load(agentType: string, family?: "claude" | "gpt"): string {
    const cacheKey = family ? `${agentType}:${family}` : agentType;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const filename = this.getPromptFilename(agentType);
    const familyPromptPath = family
      ? join(this.promptsDir, `${filename}.${family}.md`)
      : null;
    const promptPath = familyPromptPath && existsSync(familyPromptPath)
      ? familyPromptPath
      : join(this.promptsDir, `${filename}.md`);

    if (!existsSync(promptPath)) {
      const defaultContent = `당신은 ${agentType} 전문가입니다. 사용자 요청에 따라 창작적인 결과를 제공하세요.`;
      this.cache.set(cacheKey, defaultContent);
      return defaultContent;
    }

    const content = readFileSync(promptPath, "utf-8");
    this.cache.set(cacheKey, content);
    return content;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
