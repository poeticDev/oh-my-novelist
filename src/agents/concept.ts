import type { BaseAgent, AgentContext } from "./base.js";
import { PromptLoader } from "../prompts/loader.js";
import { PromptBuilder } from "../prompts/builder.js";
import type { AgentType, ConversationEntry } from "../llm/types.js";

export class ConceptAgent implements BaseAgent {
  readonly name = "Concept Agent";
  readonly description = "기획자 - 장르, 컨셉, 로그라인 개발";

  async handle(content: string, project: string | null, context: AgentContext): Promise<string> {
    // 1. Record user turn
    const userEntry: ConversationEntry = {
      role: "user",
      agentType: "concept",
      content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", userEntry);

    // 2. Load system prompt using PromptLoader
    const promptLoader = new PromptLoader();
    const systemPrompt = promptLoader.load("concept");

    // 3. Build scaffold using PromptBuilder
    const promptBuilder = new PromptBuilder(promptLoader);
    const resolvedModel = context.llmClient.resolveModel("concept");
    const prompt = promptBuilder.build(
      "concept",
      {
        role: "당신은 Oh My Novelist의 Concept Agent입니다. 15년 경력의 웹소설 기획 전문가로, 작가의 아이디어를 시장성 있는 구체적인 기획으로 발전시키는 데 탁월합니다.",
        objective: "작가의 입력을 분석하여 장르, 컨셉, 로그라인을 개발하고, 3가지 변형된 기획안을 제시하여 작가가 최적의 방향을 선택하도록 돕습니다.",
        contextSections: [
          project ? `현재 프로젝트: ${project}` : "새로운 프로젝트",
          "작가의 아이디어와 요청을 분석하여 기획안을 제시합니다."
        ],
        constraints: [
          "로그라인은 반드시 3개(A/B/C안) 제시할 것",
          "각 로그라인은 50자 이내로 간결하게 작성",
          "유사 작품은 실제 존재하는 작품을 언급 (가상 작품 금지)",
          "타겟 독자는 구체적으로 명시",
          "차별점은 단순히 '다르다'가 아닌 '왜 이 작품을 읽어야 하는가' 관점에서 작성"
        ],
        outputFormat: "마크다운 형식으로 기획 분석, 로그라인 3안, 타겟 독자 분석, 유사 작품 및 차별점, 다음 단계 질문을 포함하여 출력"
      },
      {
        userRequest: content
      },
      {
        family: resolvedModel.family
      }
    );

    // 4. Get NovelContext
    const novelContext = context.contextManager.build("concept", project);

    // 5. Call LLM
    const response = await context.llmClient.generate("concept", prompt, novelContext);

    // 6. Handle offline mode - return static fallback
    if (response.degradation === "offline") {
      return this.getStaticFallback(content, project);
    }

    // 7. Record assistant turn
    const assistantEntry: ConversationEntry = {
      role: "assistant",
      agentType: "concept",
      content: response.content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", assistantEntry);

    // 8. Return LLM content
    return response.content;
  }

  private getStaticFallback(content: string, project: string | null): string {
    return `🎨 Concept Agent입니다.

현재 LLM 서비스를 사용할 수 없어 기본 응답을 제공합니다.

**[작가의 입력]**: ${content}

${project ? `**현재 프로젝트**: ${project}` : ""}

기획 작업을 도와드리기 위해 다음 단계를 제안합니다:

1. **장르 및 타겟 독자층 정의**
   - 주 장르, 하위 장르 선정
   - 타겟 플랫폼 및 독자층 분석

2. **로그라인 작성 (3안 제시)**
   - A안: 안정형 (검증된 시장성)
   - B안: 참신형 (차별화된 접근)
   - C안: 하이브리드 (추천)

3. **컨셉 구체화**
   - 핵심 키워드 분석
   - 차별화 요소 정의

4. **유사 작품 분석 및 차별점 도출**
   - 참고할 만한 성공작 선정
   - 핵심 차별화 요소 3가지

API 키를 설정하면 더 상세한 기획안을 받아보실 수 있습니다.`;
  }
}
