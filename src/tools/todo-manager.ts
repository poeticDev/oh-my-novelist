import type { PluginInput } from "@opencode-ai/plugin";

type BunShell = PluginInput["$"];

interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  phase: string;
}

interface TodoActionArgs {
  action: "create" | "list" | "update" | "progress";
  projectName: string;
  todoId?: string;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
}

export class TodoManagerTool {
  private $: BunShell;
  private todos: Map<string, TodoItem[]> = new Map();

  constructor($: BunShell) {
    this.$ = $;
  }

  execute(args: TodoActionArgs) {
    switch (args.action) {
      case "create":
        return this.createTodos(args.projectName);
      case "list":
        return this.listTodos(args.projectName);
      case "update":
        return this.updateTodo(args.projectName, args.todoId, args.status);
      case "progress":
        return this.getProgress(args.projectName);
      default:
        return { error: "Unknown action" };
    }
  }

  private createTodos(projectName: string) {
    const defaultTodos: TodoItem[] = [
      { id: "P001", content: "장르 및 타겟 독자층 정의", status: "pending", priority: "critical", phase: "planning" },
      { id: "P002", content: "로그라인 작성", status: "pending", priority: "critical", phase: "planning" },
      { id: "P003", content: "핵심 컨셉 확정", status: "pending", priority: "high", phase: "planning" },
      { id: "W001", content: "시대/공간 설정", status: "pending", priority: "critical", phase: "worldbuilding" },
      { id: "W002", content: "마법/능력 시스템 정의", status: "pending", priority: "high", phase: "worldbuilding" },
      { id: "C001", content: "주인공 프로필 작성", status: "pending", priority: "critical", phase: "character" },
      { id: "PL001", content: "3막 구조 설계", status: "pending", priority: "critical", phase: "plotting" },
      { id: "WR001", content: "1화 집필", status: "pending", priority: "critical", phase: "writing" },
    ];
    
    this.todos.set(projectName, defaultTodos);
    return { success: true, todos: defaultTodos };
  }

  private listTodos(projectName: string) {
    const todos = this.todos.get(projectName) || [];
    return { success: true, todos };
  }

  private updateTodo(projectName: string, todoId?: string, status?: string) {
    const todos = this.todos.get(projectName);
    if (!todos || !todoId || !status) {
      return { error: "Invalid parameters" };
    }
    
    const todo = todos.find((t) => t.id === todoId);
    if (todo) {
      todo.status = status as TodoItem["status"];
      return { success: true, todo };
    }
    
    return { error: "Todo not found" };
  }

  private getProgress(projectName: string) {
    const todos = this.todos.get(projectName) || [];
    const completed = todos.filter((t) => t.status === "completed").length;
    const total = todos.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      success: true,
      progress: percentage,
      completed,
      total,
    };
  }
}
