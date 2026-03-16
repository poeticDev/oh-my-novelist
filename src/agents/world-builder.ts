import { BaseAgent } from "./base.js";

export class WorldBuilderAgent extends BaseAgent {
  readonly name = "World Builder";
  readonly description = "세계관 설계사";

  async handle(content: string, project: string | null): Promise<string> {
    return `🌍 World Builder입니다.\n\n세계관을 설계하겠습니다.\n\n${project ? `프로젝트: ${project}` : ""}\n\n어떤 세계관 요소가 필요하신가요?\n1. 시대/공간 설정\n2. 마법/능력 시스템\n3. 사회 구조\n4. 역사/신화\n5. 세계관 일관성 검증`;
  }
}
