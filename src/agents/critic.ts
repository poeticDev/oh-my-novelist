import { BaseAgent } from "./base.js";

export class CriticAgent extends BaseAgent {
  readonly name = "Critic";
  readonly description = "리뷰어";

  async handle(content: string, project: string | null): Promise<string> {
    return `🔍 Critic입니다.\n\n작품을 분석하겠습니다.\n\n${project ? `프로젝트: ${project}` : ""}\n\n어떤 부분을 검토할까요?\n1. 플롯 논리성\n2. 캐릭터 일관성\n3. 대화 자연스러움\n4. 페이싱\n5. 세계관 규칙\n6. 전체적인 몰입도\n\n검토할 내용을 복사해서 붙여주세요.`;
  }
}
