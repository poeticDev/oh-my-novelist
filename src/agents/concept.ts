import { BaseAgent } from "./base.js";

export class ConceptAgent extends BaseAgent {
  readonly name = "Concept Agent";
  readonly description = "기획자 - 장르, 컨셉, 로그라인 개발";

  async handle(content: string, project: string | null): Promise<string> {
    return `🎨 Concept Agent입니다.

기획 작업을 도와드리겠습니다.

${project ? `현재 프로젝트: ${project}` : ""}

어떤 기획이 필요하신가요?
1. 장르 및 타겟 독자층 정의
2. 로그라인 작성
3. 컨셉 구체화
4. 전체 시놉시스 작성`;
  }
}
