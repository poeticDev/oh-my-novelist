export abstract class BaseAgent {
  abstract readonly name: string;
  abstract readonly description: string;
  
  abstract handle(content: string, project: string | null): Promise<string>;
  
  protected formatResponse(content: string): string {
    return content;
  }
}
