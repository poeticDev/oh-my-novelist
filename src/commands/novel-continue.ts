import { DirectorAgent } from "../agents/director.js";

export class NovelContinueCommand {
  private director: DirectorAgent;

  constructor(director: DirectorAgent) {
    this.director = director;
  }

  async execute(args: string): Promise<string> {
    const params = this.parseArgs(args);
    
    return `📖 "${params.projectName}" 작품을 불러왔습니다.\n\n📊 진행 상황: 25%\n✅ 완료: 3개\n🔄 진행중: 1개\n⏳ 대기: 28개\n\n${params.agent}가 기다리고 있습니다!`;
  }

  private parseArgs(args: string): { projectName: string; agent: string; episode?: number } {
    const parts = args.split(" ");
    const projectName = parts[0]?.replace(/"/g, "") || "";
    
    const agentMatch = args.match(/--agent\s+(\w+)/);
    const agent = agentMatch ? agentMatch[1] : "director";
    
    const episodeMatch = args.match(/--episode\s+(\d+)/);
    const episode = episodeMatch ? parseInt(episodeMatch[1]) : undefined;
    
    return { projectName, agent, episode };
  }
}
