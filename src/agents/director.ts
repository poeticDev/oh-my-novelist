import { TodoManagerTool } from "../tools/todo-manager.js";
import type { BaseAgent } from "./base.js";

export class DirectorAgent {
  readonly name = "Director";
  readonly description = "웹소설 창작의 단일 진입점";

  async handle(
    content: string,
    project: string | null,
    agents?: Record<string, BaseAgent>,
    todoManager?: TodoManagerTool
  ): Promise<string> {
    
    if (content.includes("안녕") || content.includes("hello")) {
      return this.greet(project);
    }
    
    if (content.includes("상태") || content.includes("진행") || content.includes("progress")) {
      if (!todoManager) {
        return "Todo manager가 초기화되지 않았습니다.";
      }
      return this.showStatus(project, todoManager);
    }
    
    if (!agents) {
      return "Agents가 초기화되지 않았습니다.";
    }
    
    if (content.includes("@concept") || content.includes("기획")) {
      return agents.concept.handle(content, project);
    }
    
    if (content.includes("@world") || content.includes("세계관")) {
      return agents.worldBuilder.handle(content, project);
    }
    
    if (content.includes("@character") || content.includes("캐릭터")) {
      return agents.character.handle(content, project);
    }
    
    if (content.includes("@plot") || content.includes("플롯")) {
      return agents.plot.handle(content, project);
    }
    
    if (content.includes("@scene") || content.includes("장면")) {
      return agents.scene.handle(content, project);
    }
    
    if (content.includes("@dialogue") || content.includes("대화")) {
      return agents.dialogue.handle(content, project);
    }
    
    if (content.includes("@critic") || content.includes("검토")) {
      return agents.critic.handle(content, project);
    }
    
    if (content.includes("@editor") || content.includes("편집")) {
      return agents.editor.handle(content, project);
    }
    
    return this.defaultResponse(project);
  }

  private greet(project: string | null): string {
    if (project) {
      return `안녕하세요, 작가님! "${project}" 프로젝트를 계속 작업하시는군요.\n\n어떤 작업을 도와드릴까요?\n- 기획/컨셉 작업\n- 세계관 설계\n- 캐릭터 생성\n- 플롯 구조\n- 집필/대화 작성\n- 검토/피드백`;
    }
    
    return `안녕하세요, 작가님! Oh My Novelist에 오신 것을 환영합니다.\n\n새 작품을 시작하시려면:\n/novel-new "작품명"\n\n기존 작품을 이어가시려면:\n/novel-continue "작품명"`;
  }

  private showStatus(project: string | null, todoManager: TodoManagerTool | undefined): string {
    if (!project) {
      return "현재 진행 중인 프로젝트가 없습니다.\n/novel-new 명령어로 새 프로젝트를 시작할 수 있습니다.";
    }
    
    if (!todoManager) {
      return "Todo manager가 초기화되지 않았습니다.";
    }
    
    const progress = todoManager.getProgress(project);
    return `📊 "${project}" 진행 상황\n\n전체: ${progress.progress}% 완료\n✅ 완료: ${progress.completed}/${progress.total}`;
  }

  private defaultResponse(project: string | null): string {
    return `작가님의 요청을 이해했습니다.\n\n${project ? `현재 프로젝트: ${project}` : "프로젝트를 선택해주세요"}\n\n구체적으로 어떤 작업이 필요하신가요?\n- @concept: 기획/컨셉\n- @world: 세계관\n- @character: 캐릭터\n- @plot: 플롯\n- @scene: 장면 작성\n- @dialogue: 대화 작성\n- @critic: 검토/피드백\n- @editor: 편집/교정`;
  }
}
