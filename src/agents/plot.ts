import type { BaseAgent } from "./base.js";

export class PlotAgent implements BaseAgent {
  readonly name = "Plot Architect";
  readonly description = "플롯 설계사";

  async handle(content: string, project: string | null): Promise<string> {
    return `📊 Plot Architect입니다.\n\n플롯 구조를 설계하겠습니다.\n\n${project ? `프로젝트: ${project}` : ""}\n\n어떤 플롯 작업이 필요하신가요?\n1. 3막 구조 설계\n2. 주요 전환점 정의\n3. 챕터별 개요\n4. 훅 배치 계획\n5. 서브플롯 구성`;
  }
}
