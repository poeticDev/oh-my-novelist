/**
 * Prompt Pipeline Types
 *
 * Types for the prompt scaffolding and building system.
 * Defines the structure for composing dynamic prompts from scaffolds
 * and agent-specific instructions.
 */

/**
 * PromptScaffold defines the structure and requirements for a prompt.
 * This is agent-agnostic and defines what the LLM should do.
 */
export interface PromptScaffold {
  /** The role/persona for the LLM (e.g., "당신은 웹소설 기획 전문가입니다") */
  role: string;

  /** The objective/task to accomplish (e.g., "로그라인 3개를 생성하세요") */
  objective: string;

  /** Context sections to include (e.g., project info, phase, progress) */
  contextSections: string[];

  /** Constraints/rules to follow */
  constraints: string[];

  /** Expected output format */
  outputFormat: string;

  /** Optional tone/style guidance */
  tone?: string;
}

/**
 * Variables available for substitution in prompts.
 * These are provided at build time.
 */
export interface PromptVariables {
  /** The user's original request/input */
  userRequest: string;
}

/**
 * The final built prompt ready for LLM consumption.
 */
export interface BuiltPrompt {
  /** System prompt combining scaffold + agent instructions */
  system: string;

  /** User prompt containing the actual request */
  user: string;
}

export interface PromptBuildOptions {
  family?: "claude" | "gpt";
}
