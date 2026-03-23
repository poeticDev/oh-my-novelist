import type { BaseAgent } from "./base.js";

export class SceneAgent implements BaseAgent {
  readonly name = "Scene Writer";
  readonly description = "장면 작가";

  async handle(content: string, project: string | null): Promise<string> {
    return `✍️ Scene Writer입니다.\n\n장면을 작성하겠습니다.\n\n${project ? `프로젝트: ${project}` : ""}\n\n어떤 장면을 작성할까요?\n- 어떤 장소인가요?\n- 어떤 시간대인가요?\n- 어떤 분위기인가요?\n- 무슨 일이 일어나나요?\n\n상세하게 설명해주세요.`;
  }
}
