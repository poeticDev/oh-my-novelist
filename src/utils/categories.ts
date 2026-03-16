import { NovelIntent } from "./intent-parser.js";

export interface CategoryConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  description: string;
}

export class CategoryManager {
  private categories: Record<string, CategoryConfig> = {
    "novel-planning": {
      model: "opencode-go/kimi-k2.5",
      temperature: 0.8,
      maxTokens: 4096,
      description: "창의적 기획",
    },
    "novel-writing": {
      model: "opencode-go/kimi-k2.5",
      temperature: 0.7,
      maxTokens: 8192,
      description: "생동감 있는 집필",
    },
    "novel-editing": {
      model: "opencode-go/kimi-k2.5",
      temperature: 0.3,
      maxTokens: 4096,
      description: "정확한 편집",
    },
    "novel-analysis": {
      model: "opencode-go/kimi-k2.5",
      temperature: 0.4,
      maxTokens: 4096,
      description: "객관적 분석",
    },
  };

  getCategory(intent: NovelIntent): CategoryConfig {
    const mapping: Record<NovelIntent, string> = {
      [NovelIntent.PLANNING]: "novel-planning",
      [NovelIntent.WORLDBUILDING]: "novel-planning",
      [NovelIntent.CHARACTER]: "novel-planning",
      [NovelIntent.PLOTTING]: "novel-planning",
      [NovelIntent.WRITING]: "novel-writing",
      [NovelIntent.REVIEWING]: "novel-analysis",
      [NovelIntent.EDITING]: "novel-editing",
      [NovelIntent.UNKNOWN]: "novel-planning",
    };

    return this.categories[mapping[intent]] || this.categories["novel-planning"];
  }

  updateConfig(newCategories: Record<string, CategoryConfig>) {
    this.categories = { ...this.categories, ...newCategories };
  }
}
