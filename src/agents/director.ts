import type { TodoManagerTool, TodoResponse } from "../tools/todo-manager.js";
import type { BaseAgent, AgentContext } from "./base.js";
import type { ProjectState } from "../utils/state.js";

export class DirectorAgent {
  readonly name = "Director";
  readonly description = "웹소설 창작의 단일 진입점";

  async handle(
    content: string,
    project: string | null,
    agents: Record<string, BaseAgent>,
    context: AgentContext
  ): Promise<string> {
    const lowerContent = content.toLowerCase();

    const todoManager = context.contextManager as unknown as TodoManagerTool;
    let projectState: ProjectState | null = null;
    if (project) {
      const novelContext = context.contextManager.build("director", project);
      projectState = novelContext.canon?.project ?? null;
    }

    if (lowerContent.includes("help") || lowerContent.includes("도움") || lowerContent.includes("?") || lowerContent.includes("사용법")) {
      return this.getHelpMessage(project);
    }

    if (lowerContent.includes("안녕") || lowerContent.includes("hello") || lowerContent.includes("시작")) {
      return this.getWelcomeMessage(project, projectState, todoManager);
    }

    if (lowerContent.includes("상태") || lowerContent.includes("진행") || lowerContent.includes("progress") || lowerContent.includes("상황")) {
      return this.getProjectSummary(project, projectState, todoManager);
    }

    const agentKey = this.selectSpecialistAgent(content);
    if (agentKey && agents[agentKey]) {
      const response = await agents[agentKey].handle(content, project, context);
      return this.wrapDelegatedResponse(agentKey, response, project);
    }

    return this.getDefaultResponse(project, projectState, todoManager);
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
    return `[${agentName}의 응답]

${response}

---
다른 작업이 필요하시면 말씀해 주세요. (@concept, @world, @character 등으로 직접 호출 가능)`;
  }

  private getWelcomeMessage(
    project: string | null,
    projectState?: ProjectState | null,
    todoManager?: TodoManagerTool
  ): string {
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

      let message = `👋 안녕하세요, 작가님!

📖 현재 프로젝트: "${project}"
🎯 현재 단계: ${phaseNames[phase] || phase}

`;

      if (todoManager) {
        const suggestion = this.getNextSuggestedAction(project, todoManager);
        if (suggestion) {
          message += `💡 ${suggestion}\n\n`;
        }
      }

      message += `작업을 시작하려면:
• @concept - 기획/컨셉 작업
• @world - 세계관 설계
• @character - 캐릭터 생성
• @plot - 플롯 구조
• @scene - 장면 작성
• @dialogue - 대화 작성

진행상황 확인: "상태" 또는 "진행"`;

      return message;
    }

    return `👋 Oh My Novelist에 오신 것을 환영합니다!

새 작품을 시작하시려면 다음을 입력하세요:
• novelist_init_project 도구로 "프로젝트명" 생성

또는 대화로 시작:
• "새 프로젝트 '작품명'으로 시작할게"

도움이 필요하시면 "help" 또는 "도움"을 입력하세요.`;
  }

  private getProjectSummary(
    project: string | null,
    projectState?: ProjectState | null,
    todoManager?: TodoManagerTool
  ): string {
    if (!project) {
      return `📭 현재 진행 중인 프로젝트가 없습니다.

새 프로젝트를 시작하려면:
• novelist_init_project 도구 사용
• 또는 "새 프로젝트 시작"이라고 말씀해 주세요`;
    }

    if (!todoManager) {
      return "⚠️ Todo manager가 초기화되지 않았습니다.";
    }

    const result: TodoResponse = todoManager.getProgress(project);

    if (!result.success || !result.progress) {
      return `"${project}" 프로젝트의 진행 정보를 불러올 수 없습니다.`;
    }

    const phase = projectState?.currentPhase || "planning";
    const phaseNames: Record<string, string> = {
      planning: "기획",
      worldbuilding: "세계관",
      character: "캐릭터",
      plotting: "플롯",
      writing: "집필",
      editing: "편집",
    };

    const { percentage, completed, total, byPhase } = result.progress;

    let response = `📊 "${project}" 프로젝트 현황\n\n`;
    response += `🎯 현재 단계: ${phaseNames[phase] || phase}\n`;
    response += `📈 전체 진행: ${percentage}% 완료\n`;
    response += `✅ 완료: ${completed}/${total}\n\n`;

    if (byPhase && Object.keys(byPhase).length > 0) {
      response += "단계별 진행:\n";
      for (const [phaseKey, data] of Object.entries(byPhase)) {
        const phasePercent = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        response += `  ${phaseNames[phaseKey] || phaseKey}: ${phasePercent}% (${data.completed}/${data.total})\n`;
      }
      response += "\n";
    }

    const suggestion = this.getNextSuggestedAction(project, todoManager);
    if (suggestion) {
      response += `💡 ${suggestion}`;
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
      return `진행 중인 작업 완료하기: "${todo.content}" (${todo.id})`;
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
      return `"${phaseNames[todo.phase] || todo.phase}" 단계 시작하기: "${todo.content}" (${todo.id})`;
    }

    return "🎉 모든 작업이 완료되었습니다! 다음 단계로 넘어가거나 새로운 작업을 추가해보세요.";
  }

  private getHelpMessage(project: string | null): string {
    let message = `📚 Oh My Novelist 사용법\n\n`;

    if (!project) {
      message += `🆕 프로젝트 시작하기:\n`;
      message += `• novelist_init_project 도구로 프로젝트 생성\n`;
      message += `• 예: "새 프로젝트 '나의 판타지' 시작"\n\n`;
    } else {
      message += `📖 현재 프로젝트: "${project}"\n\n`;
      message += `🔍 상태 확인:\n`;
      message += `• "상태" 또는 "진행" 입력\n\n`;
    }

    message += `🎭 에이전트 호출:\n`;
    message += `• @concept - 기획/컨셉\n`;
    message += `• @world - 세계관 설계\n`;
    message += `• @character - 캐릭터 생성\n`;
    message += `• @plot - 플롯 구조\n`;
    message += `• @scene - 장면 작성\n`;
    message += `• @dialogue - 대화 작성\n`;
    message += `• @critic - 검토/피드백\n`;
    message += `• @editor - 편집/교정\n\n`;

    message += `📝 Todo 관리:\n`;
    message += `• novelist_todo 도구 사용\n`;
    message += `• action: create/list/update/progress\n\n`;

    message += `⚠️ 현재 제한 사항:\n`;
    message += `• Todo 상태는 수동으로 업데이트해야 합니다\n`;
    message += `• 템플릿 생성은 아직 지원되지 않습니다\n`;
    message += `• AI 응답을 위해서는 ANTHROPIC_API_KEY 설정이 필요합니다`;

    return message;
  }

  private getDefaultResponse(
    project: string | null,
    projectState?: ProjectState | null,
    todoManager?: TodoManagerTool
  ): string {
    if (!project) {
      return `프로젝트를 먼저 시작해 주세요.

💡 시작 방법:
• novelist_init_project 도구로 프로젝트 생성
• 또는 "help" 입력하여 도움말 보기`;
    }

    const phase = projectState?.currentPhase || "planning";
    const phaseNames: Record<string, string> = {
      planning: "기획",
      worldbuilding: "세계관",
      character: "캐릭터",
      plotting: "플롯",
      writing: "집필",
      editing: "편집",
    };

    let response = `"${project}" 프로젝트 (${phaseNames[phase] || phase} 단계)\n\n`;

    if (todoManager) {
      const suggestion = this.getNextSuggestedAction(project, todoManager);
      if (suggestion) {
        response += `💡 ${suggestion}\n\n`;
      }
    }

    response += `어떤 작업을 도와드릴까요?\n`;
    response += `• @concept, @world, @character 등으로 에이전트 호출\n`;
    response += `• "상태" 입력으로 진행 확인\n`;
    response += `• "help" 입력으로 도움말 보기`;

    return response;
  }
}
