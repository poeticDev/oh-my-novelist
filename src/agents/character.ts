import type { BaseAgent } from "./base.js";

export class CharacterAgent implements BaseAgent {
  readonly name = "Character Designer";
  readonly description = "캐릭터 디자이너";

  async handle(content: string, project: string | null): Promise<string> {
    return `👤 Character Designer입니다.\n\n캐릭터를 설계하겠습니다.\n\n${project ? `프로젝트: ${project}` : ""}\n\n어떤 캐릭터 작업이 필요하신가요?\n1. 주인공 프로필\n2. 조연 캐릭터\n3. 악역/적대자\n4. 캐릭터 관계도\n5. 성장 아크 설계`;
  }
}
