import { TemplateGeneratorTool } from "../tools/template-generator.js";
import { TodoManagerTool } from "../tools/todo-manager.js";

export class NovelNewCommand {
  private templateGenerator: TemplateGeneratorTool;
  private todoManager: TodoManagerTool;
  private lastProjectName: string | null = null;

  constructor(templateGenerator: TemplateGeneratorTool, todoManager: TodoManagerTool) {
    this.templateGenerator = templateGenerator;
    this.todoManager = todoManager;
  }

  async execute(args: string): Promise<string> {
    const params = this.parseArgs(args);
    
    this.lastProjectName = params.projectName;
    
    return `✅ "${params.projectName}" 프로젝트가 생성되었습니다!\n\n📁 위치: ${params.outputPath}/${params.projectName}\n📋 템플릿: ${params.template}\n📝 Todo: 작업 목록이 준비되었습니다\n\n바로 시작할까요?`;
  }

  getLastProjectName(): string | null {
    return this.lastProjectName;
  }

  private parseArgs(args: string): { projectName: string; template: string; outputPath: string } {
    const parts = args.split(" ");
    const projectName = parts[0]?.replace(/"/g, "") || "untitled";
    
    const templateMatch = args.match(/--template\s+(\w+)/);
    const template = templateMatch ? templateMatch[1] : "default";
    
    const pathMatch = args.match(/--path\s+(\S+)/);
    const outputPath = pathMatch ? pathMatch[1] : "~/Documents/novels";
    
    return { projectName, template, outputPath };
  }
}
