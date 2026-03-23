import type { BaseAgent } from "./base.js";

export class EditorAgent implements BaseAgent {
  readonly name = "Editor";
  readonly description = "편집자";

  async handle(content: string, project: string | null): Promise<string> {
    return `✏️ Editor입니다.\n\n편집하겠습니다.\n\n${project ? `프로젝트: ${project}` : ""}\n\n어떤 편집이 필요하신가요?\n1. 문장 간결화\n2. 문법 교정\n3. 문체 일관성\n4. 중복 제거\n5. 리듬 개선\n\n편집할 내용을 복사해서 붙여주세요.`;
  }
}
