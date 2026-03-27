import type { BaseAgent, AgentContext } from "./base.js";
import { PromptLoader } from "../prompts/loader.js";
import { PromptBuilder } from "../prompts/builder.js";
import type { AgentType, ConversationEntry } from "../llm/types.js";

export class WorldBuilderAgent implements BaseAgent {
  readonly name = "World Builder";
  readonly description = "세계관 설계사";

  async handle(content: string, project: string | null, context: AgentContext): Promise<string> {
    // 1. Record user turn
    const userEntry: ConversationEntry = {
      role: "user",
      agentType: "worldBuilder",
      content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", userEntry);

    // 2. Load system prompt using PromptLoader
    const promptLoader = new PromptLoader();
    const systemPrompt = promptLoader.load("worldBuilder");

    // 3. Build scaffold using PromptBuilder
    const promptBuilder = new PromptBuilder(promptLoader);
    const prompt = promptBuilder.build(
      "worldBuilder",
      {
        role: "당신은 Oh My Novelist의 World Builder입니다. 10년 이상의 세계관 디자인 경력을 가진 전문가로, 판타지, SF, 현대 판타지 등 다양한 장르의 세계관을 체계적으로 구축합니다.",
        objective: "작가의 컨셉을 바탕으로 독자가 믿고 빠져들 수 있는 일관된 세계관을 창조합니다. 마법/능력 시스템, 역사 연표, 사회 구조, 지리/환경을 체계적으로 설계합니다.",
        contextSections: [
          project ? `현재 프로젝트: ${project}` : "새로운 프로젝트",
          "작가의 요청을 분석하여 세계관 요소를 설계합니다."
        ],
        constraints: [
          "규칙은 명확하고 일관되게 작성 (모순 금지)",
          "모든 설정은 '왜?'에 답할 수 있어야 함",
          "현실 세계의 물리/논리를 완전히 무시하지 말 것 (현실감 유지)",
          "과도한 설정은 피하고, 이야기에 필요한 만큼만",
          "캐릭터가 살아갈 공간으로서의 기능 고려"
        ],
        outputFormat: "마크다운 형식으로 기본 정보, 마법/능력 시스템, 역사 연표, 사회 구조, 지리, 세계관 활용 가이드를 포함하여 출력"
      },
      {
        userRequest: content
      }
    );

    // 4. Get NovelContext
    const novelContext = context.contextManager.build("worldBuilder", project);

    // 5. Call LLM
    const response = await context.llmClient.generate("worldBuilder", prompt, novelContext);

    // 6. Handle offline mode - return static fallback
    if (response.degradation === "offline") {
      return this.getStaticFallback(content, project);
    }

    // 7. Record assistant turn
    const assistantEntry: ConversationEntry = {
      role: "assistant",
      agentType: "worldBuilder",
      content: response.content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", assistantEntry);

    // 8. Return LLM content
    return response.content;
  }

  private getStaticFallback(content: string, project: string | null): string {
    return `🌍 World Builder입니다.

현재 LLM 서비스를 사용할 수 없어 기본 응답을 제공합니다.

**[작가의 입력]**: ${content}

${project ? `**현재 프로젝트**: ${project}` : ""}

세계관 설계를 도와드리기 위해 다음 단계를 제안합니다:

1. **기본 정보 수집**
   - 장르 (판타지/현대판타지/SF/무협 등)
   - 시대적 배경 (중세/근대/현대/미래)
   - 핵심 컨셉 (마법/기술/능력/수련 등)
   - 세계관의 규모 (도시/국가/대륙/행성/우주)

2. **핵심 규칙 설계**
   - 마법/능력 시스템 (힘의 원천, 사용 조건, 제약)
   - 기술 시스템 (해당 장르)
   - 성장/강화 방식

3. **역사 연표**
   - 창세/기원
   - 주요 시대별 사건
   - 현재까지의 흐름

4. **사회 구조**
   - 정치 체제
   - 경제 시스템
   - 문화/종교
   - 주요 갈등

5. **지리/환경**
   - 전체 지도 구조
   - 주요 지역별 특성
   - 중요 장소

API 키를 설정하면 더 상세한 세계관 설계를 받아보실 수 있습니다.`;
  }
}