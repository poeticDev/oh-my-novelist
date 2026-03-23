import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  phase: string;
}

interface TodoData {
  todos: TodoItem[];
  updatedAt: string;
}

const TODOS_DIR = ".oh-my-novelist/todos";

export class TodoManagerTool {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private getTodoPath(projectName: string): string {
    return join(this.baseDir, TODOS_DIR, `${projectName}.json`);
  }

  private loadTodos(projectName: string): TodoItem[] {
    const todoPath = this.getTodoPath(projectName);
    if (!existsSync(todoPath)) {
      return [];
    }
    const data = JSON.parse(readFileSync(todoPath, "utf-8")) as TodoData;
    return data.todos;
  }

  private saveTodos(projectName: string, todos: TodoItem[]): void {
    const todoPath = this.getTodoPath(projectName);
    const todoDir = dirname(todoPath);
    if (!existsSync(todoDir)) {
      mkdirSync(todoDir, { recursive: true });
    }
    const data: TodoData = {
      todos,
      updatedAt: new Date().toISOString()
    };
    writeFileSync(todoPath, JSON.stringify(data, null, 2), "utf-8");
  }

  createTodos(projectName: string) {
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
    
    this.saveTodos(projectName, defaultTodos);
    return { success: true, todos: defaultTodos };
  }

  listTodos(projectName: string) {
    const todos = this.loadTodos(projectName);
    return { success: true, todos };
  }

  updateTodo(projectName: string, todoId?: string, status?: string) {
    const todos = this.loadTodos(projectName);
    if (!todoId || !status) {
      return { error: "Invalid parameters" };
    }
    
    const todo = todos.find((t) => t.id === todoId);
    if (todo) {
      todo.status = status as TodoItem["status"];
      this.saveTodos(projectName, todos);
      return { success: true, todo };
    }
    
    return { error: "Todo not found" };
  }

  getProgress(projectName: string) {
    const todos = this.loadTodos(projectName);
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
