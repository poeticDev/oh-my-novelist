import type { TodoManagerTool, TodoResponse } from "../tools/todo-manager.js";
import type { BaseAgent } from "./base.js";
import type { ProjectState } from "../utils/state.js";

export class DirectorAgent {
  readonly name = "Director";
  readonly description = "웹소설 창작의 단일 진입점";

  async handle(
    content: string,
    project: string | null,
    agents?: Record<string, BaseAgent>,
    todoManager?: TodoManagerTool,
    projectState?: ProjectState | null
  ): Promise<string> {
    if (content.includes("안녕") || content.includes("hello")) {
      return this.greet(project, projectState);
    }

    if (content.includes("상태") || content.includes("진행") || content.includes("progress")) {
      return this.showStatus(project, todoManager);
    }

    if (!agents) {
      return "Agents가 초기화되지 않았습니다.";
    }

    const agentKey = this.selectSpecialistAgent(content);
    if (agentKey && agents[agentKey]) {
      const response = await agents[agentKey].handle(content, project);
      return this.wrapDelegatedResponse(agentKey, response, project);
    }

    return this.defaultResponse(project, todoManager, projectState);
  }

  private selectSpecialistAgent(content: string): string | null {
    if (content.includes("@concept") || content.includes("기획")) return "concept";
    if (content.includes("@world") || content.includes("세계관")) return "worldBuilder";
    if (content.includes("@character") || content.includes("캐릭터")) return "character";
    if (content.includes("@plot") || content.includes("플롯")) return "plot";
    if (content.includes("@scene") || content.includes("장면")) return "scene";
    if (content.includes("@dialogue") || content.includes("대화")) return "dialogue";
    if (content.includes("@critic") || content.includes("검토")) return "critic";
    if (content.includes("@editor") || content.includes("편집")) return "editor";
    return null;
  }

  private wrapDelegatedResponse(agentKey: string, response: string, project: string | null): string {
    const agentNames: Record<string, string> = {
      concept: "기획 에이전트",
      worldBuilder: "세계관 설계사",
      character: "캐릭터 디자이너",
      plot: "플롯 설계사",
      scene: "장면 작가",
      dialogue: "대화 작가",
      critic: "검토 에이전트",
      editor: "편집 에이전트",
    };

    const agentName = agentNames[agentKey] || agentKey;
    return `[${agentName}의 응답]\n\n${response}\n\n---\n다른 작업이 필요하시면 말씀해 주세요.`;
  }

  private greet(project: string | null, projectState?: ProjectState | null): string {
    if (project) {
      const phase = projectState?.currentPhase || "planning";
      const phaseNames: Record<string, string> = {
        planning: "기획",
        worldbuilding: "세계관",
        character: "캐릭터",
        plotting: "플롯",
        writing: "집필",
        editing: "편집",
      };

      return `안녕하세요, 작가님! "${project}" 프로젝트를 계속 작업하시는군요.\n\n현재 단계: ${phaseNames[phase] || phase}\n\n어떤 작업을 도와드릴까요?\n- 기획/컨셉 작업\n- 세계관 설계\n- 캐릭터 생성\n- 플롯 구조\n- 집필/대화 작성\n- 검토/피드백\n\n(상태 확인: "진행상황" 입력)`;
    }

    return `안녕하세요, 작가님! Oh My Novelist에 오신 것을 환영합니다.\n\n새 작품을 시작하시려면:\n/novel-new "작품명"\n\n기존 작품을 이어가시려면:\n/novel-continue "작품명"`;
  }

  private showStatus(project: string | null, todoManager?: TodoManagerTool): string {
    if (!project) {
      return "현재 진행 중인 프로젝트가 없습니다.\n/novel-new 명령어로 새 프로젝트를 시작할 수 있습니다.";
    }

    if (!todoManager) {
      return "Todo manager가 초기화되지 않았습니다.";
    }

    const result: TodoResponse = todoManager.getProgress(project);

    if (!result.success || !result.progress) {
      return `"${project}" 프로젝트의 진행 정보를 불러올 수 없습니다.`;
    }

    const { percentage, completed, total, byPhase } = result.progress;

    let response = `📊 "${project}" 진행 상황\n\n`;
    response += `전체: ${percentage}% 완료\n`;
    response += `✅ 완료: ${completed}/${total}\n\n`;

    if (byPhase && Object.keys(byPhase).length > 0) {
      response += "단계별 진행:\n";
      const phaseNames: Record<string, string> = {
        planning: "기획",
        worldbuilding: "세계관",
        character: "캐릭터",
        plotting: "플롯",
        writing: "집필",
      };

      for (const [phase, data] of Object.entries(byPhase)) {
        const phasePercent = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        response += `  ${phaseNames[phase] || phase}: ${phasePercent}% (${data.completed}/${data.total})\n`;
      }
      response += "\n";
    }

    const suggestion = this.getNextSuggestedAction(project, todoManager);
    if (suggestion) {
      response += `💡 추천 다음 작업:\n${suggestion}`;
    }

    return response;
  }

  private getNextSuggestedAction(project: string, todoManager: TodoManagerTool): string | null {
    const result = todoManager.listTodos(project);
    if (!result.success || !result.todos || result.todos.length === 0) {
      return null;
    }

    const pendingTodos = result.todos.filter((t) => t.status === "pending");
    const inProgressTodos = result.todos.filter((t) => t.status === "in_progress");

    if (inProgressTodos.length > 0) {
      const todo = inProgressTodos[0];
      return `진행 중인 작업 완료하기: "${todo.content}" (${todo.id})\n완료하려면: 상태를 completed로 업데이트하세요.`;
    }

    if (pendingTodos.length > 0) {
      const todo = pendingTodos[0];
      const phaseNames: Record<string, string> = {
        planning: "기획",
        worldbuilding: "세계관",
        character: "캐릭터",
        plotting: "플롯",
        writing: "집필",
      };
      return `"${phaseNames[todo.phase] || todo.phase}" 단계 시작하기: "${todo.content}" (${todo.id})\n시작하려면: 상태를 in_progress로 업데이트하세요.`;
    }

    return "모든 작업이 완료되었습니다! 🎉\n다음 단계로 넘어가거나 새로운 작업을 추가해보세요.";
  }

  private defaultResponse(
    project: string | null,
    todoManager?: TodoManagerTool,
    projectState?: ProjectState | null
  ): string {
    let response = "작가님의 요청을 이해했습니다.\n\n";

    if (project) {
      const phase = projectState?.currentPhase || "planning";
      response += `현재 프로젝트: ${project} (${phase} 단계)\n\n`;

      if (todoManager) {
        const suggestion = this.getNextSuggestedAction(project, todoManager);
        if (suggestion) {
          response += `💡 ${suggestion}\n\n`;
        }
      }
    } else {
      response += "프로젝트를 선택해주세요.\n\n";
    }

    response += "구체적으로 어떤 작업이 필요하신가요?\n";
    response += "- @concept: 기획/컨셉\n";
    response += "- @world: 세계관\n";
    response += "- @character: 캐릭터\n";
    response += "- @plot: 플롯\n";
    response += "- @scene: 장면 작성\n";
    response += "- @dialogue: 대화 작성\n";
    response += "- @critic: 검토/피드백\n";
    response += "- @editor: 편집/교정\n\n";
    response += "(진행상황 확인: \"상태\" 또는 \"진행\" 입력)";

    return response;
  }
}
