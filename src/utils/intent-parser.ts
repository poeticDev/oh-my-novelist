export enum NovelIntent {
  PLANNING = "planning",
  WORLDBUILDING = "worldbuilding",
  CHARACTER = "character",
  PLOTTING = "plotting",
  WRITING = "writing",
  REVIEWING = "reviewing",
  EDITING = "editing",
  UNKNOWN = "unknown",
}

export class IntentParser {
  private keywords: Record<NovelIntent, string[]> = {
    [NovelIntent.PLANNING]: ["기획", "아이디어", "컨셉", "장르", "로그라인", "시놉시스"],
    [NovelIntent.WORLDBUILDING]: ["세계관", "배경", "역사", "마법", "규칙", "설정"],
    [NovelIntent.CHARACTER]: ["캐릭터", "인물", "주인공", "성격", "관계", "프로필"],
    [NovelIntent.PLOTTING]: ["플롯", "구조", "전개", "훅", "클리맥스", "아크"],
    [NovelIntent.WRITING]: ["써줘", "작성", "장면", "대화", "지문", "챕터"],
    [NovelIntent.REVIEWING]: ["봐줘", "검토", "어때", "피드백", "평가", "분석"],
    [NovelIntent.EDITING]: ["다듬어", "교정", "편집", "수정", "고쳐", "문장"],
    [NovelIntent.UNKNOWN]: [],
  };

  parse(message: string): NovelIntent {
    const lowerMessage = message.toLowerCase();
    
    for (const [intent, words] of Object.entries(this.keywords)) {
      for (const word of words) {
        if (lowerMessage.includes(word)) {
          return intent as NovelIntent;
        }
      }
    }
    
    return NovelIntent.UNKNOWN;
  }
}
