export interface BaseAgent {
  name: string;
  description: string;
  handle(content: string, project: string | null): Promise<string>;
}
