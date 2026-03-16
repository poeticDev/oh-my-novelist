import { TodoManagerTool } from "../tools/todo-manager.js";

export class NovelTodoCommand {
  private todoManager: TodoManagerTool;

  constructor(todoManager: TodoManagerTool) {
    this.todoManager = todoManager;
  }

  async execute(args: string): Promise<string> {
    const params = this.parseArgs(args);
    
    if (params.subcommand === "show") {
      return this.showTodos(params.projectName);
    } else if (params.subcommand === "progress") {
      return this.showProgress(params.projectName);
    } else if (params.subcommand === "update") {
      return `✅ Todo "${params.todoId}"가 ${params.status}로 업데이트되었습니다.`;
    }
    
    return "사용법: /novel-todo show|progress|update|add";
  }

  private showTodos(projectName: string): string {
    return `📋 ${projectName} - Todo 목록\n\n### 기획 단계\n⏳ P001: 장르 및 타겟 독자층 정의 [Critical]\n⏳ P002: 로그라인 작성 [Critical]\n✅ P003: 핵심 컨셉 확정 [High]\n\n### 세계관 설계\n🔄 W001: 시대/공간 설정 [Critical]\n⏳ W002: 마법/능력 시스템 정의 [High]`;
  }

  private showProgress(projectName: string): string {
    return `📊 ${projectName} - 진행 상황\n\n전체: 25% (3/12 완료)\n\n기획: ████████░░ 75%\n세계관: ███░░░░░░░ 30%\n캐릭터: ░░░░░░░░░░ 0%\n\n💪 화이팅!`;
  }

  private parseArgs(args: string): { subcommand: string; projectName: string; todoId?: string; status?: string } {
    const parts = args.split(" ");
    const subcommand = parts[0] || "show";
    const projectName = parts[1]?.replace(/"/g, "") || "";
    
    const todoMatch = args.match(/--todo_id\s+(\w+)/);
    const statusMatch = args.match(/--status\s+(\w+)/);
    
    return {
      subcommand,
      projectName,
      todoId: todoMatch ? todoMatch[1] : undefined,
      status: statusMatch ? statusMatch[1] : undefined,
    };
  }
}
