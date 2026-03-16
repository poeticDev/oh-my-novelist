export class NovelStatsCommand {
  async execute(args: string): Promise<string> {
    const params = this.parseArgs(args);
    
    if (params.detailLevel === "summary") {
      return this.summaryStats(params.projectName);
    } else if (params.detailLevel === "detailed") {
      return this.detailedStats(params.projectName);
    }
    
    return this.summaryStats(params.projectName);
  }

  private summaryStats(projectName: string): string {
    return `📊 ${projectName} - 통계 요약\n\n📝 분량:\n   총 글자수: 15,000자\n   총 회차: 5화\n   평균 회차 글자수: 3,000자\n\n👤 캐릭터:\n   등장 인물: 4명\n   주인공: 김민수\n\n📈 진행:\n   완료: 25%`;
  }

  private detailedStats(projectName: string): string {
    return `📊 ${projectName} - 상세 통계\n\n📝 분량 분석:\n   총 글자수: 15,000자\n   총 회차: 5화\n   평균 회차 글자수: 3,000자\n\n👤 캐릭터 분석:\n   등장 인물: 4명\n   - 주연: 1명\n   - 조연: 2명\n   - 단역: 1명\n\n📈 진행 분석:\n   완료: 25%\n   현재 단계: 세계관 설계\n\n💡 제안사항:\n   - 2화 분량이 평균보다 짧습니다.\n   - 캐릭터 대화 비율을 늘려보세요.`;
  }

  private parseArgs(args: string): { projectName: string; detailLevel: string } {
    const parts = args.split(" ");
    const projectName = parts[0]?.replace(/"/g, "") || "";
    
    const detailMatch = args.match(/--detail_level\s+(\w+)/);
    const detailLevel = detailMatch ? detailMatch[1] : "summary";
    
    return { projectName, detailLevel };
  }
}
