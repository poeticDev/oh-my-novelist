import { BaseAgent } from "./base.js";

export class DialogueAgent extends BaseAgent {
  readonly name = "Dialogue Writer";
  readonly description = "대화 작가";

  async handle(content: string, project: string | null): Promise<string> {
    return `💬 Dialogue Writer입니다.\n\n대화를 작성하겠습니다.\n\n${project ? `프로젝트: ${project}` : ""}\n\n어떤 대화가 필요하신가요?\n- 어떤 캐릭터들의 대화인가요?\n- 어떤 상황인가요?\n- 무엇을 주고받아야 하나요?\n- 어떤 감정이 담겨있나요?`;
  }
}
