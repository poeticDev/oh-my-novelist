import { BaseAgent } from "./base.js";

export class DirectorAgent extends BaseAgent {
  readonly name = "Director";
  readonly description = "웹소설 창작의 단일 진입점";

  async handle(
    content: string,
    project: string | null,
    agents?: Record<string, BaseAgent>
  ): Promise<string> {
    
    // Greeting
    if (content.includes("안녕") || content.includes("hello")) {
      return this.greet(project);
    }
    
    // Project status
    if (content.includes("상태") || content.includes("진행") || content.includes("progress")) {
      return this.showStatus(project);
    }
    
    // Default response
    return this.defaultResponse(project);
  }

  private greet(project: string | null): string {
    if (project) {
      return `안녕하세요, 작가님! "${project}" 프로젝트를 계속 작업하시는군요.\n\n어떤 작업을 도와드릴까요?\n- 기획/컨셉 작업\n- 세계관 설계\n- 캐릭터 생성\n- 플롯 구조\n- 집필/대화 작성\n- 검토/피드백`;
    }
    
    return `안녕하세요, 작가님! Oh My Novelist에 오신 것을 환영합니다.\n\n새 작품을 시작하시려면:\n/novel-new "작품명"\n\n기존 작품을 이어가시려면:\n/novel-continue "작품명"`;
  }

  private showStatus(project: string | null): string {
    if (!project) {
      return "현재 진행 중인 프로젝트가 없습니다.\n/novel-new 명령어로 새 프로젝트를 시작핼 수 있습니다.";
    }
    
    return `📊 "${project}" 진행 상황\n\n전체: 25% 완료\n✅ 기획: 75%\n🔄 세계관: 40%\n⏳ 캐릭터: 0%\n⏳ 플롯: 0%\n⏳ 집필: 0%\n⏳ 편집: 0%\n\n다음 작업을 시작할까요?`;
  }

  private defaultResponse(project: string | null): string {
    return `작가님의 요청을 이해했습니다.\n\n${project ? `현재 프로젝트: ${project}` : "프로젝트를 선택해주세요"}\n\n구체적으로 어떤 작업이 필요하신가요?\n- 아이디어가 있어요\n- 세계관을 만들고 싶어요\n- 캐릭터를 설계하고 싶어요\n- 장면을 쓰고 싶어요\n- 피드백이 필요해요`;
  }
}
