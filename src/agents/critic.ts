import type { BaseAgent, AgentContext } from "./base.js";
import { PromptLoader } from "../prompts/loader.js";
import { PromptBuilder } from "../prompts/builder.js";
import type { AgentType, ConversationEntry } from "../llm/types.js";

export class CriticAgent implements BaseAgent {
  readonly name = "Critic";
  readonly description = "리뷰어";

  async handle(content: string, project: string | null, context: AgentContext): Promise<string> {
    // 1. Record user turn
    const userEntry: ConversationEntry = {
      role: "user",
      agentType: "critic",
      content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", userEntry);

    // 2. Load system prompt using PromptLoader
    const promptLoader = new PromptLoader();
    const systemPrompt = promptLoader.load("critic");

    // 3. Build scaffold using PromptBuilder
    const promptBuilder = new PromptBuilder(promptLoader);
    const prompt = promptBuilder.build(
      "critic",
      {
        role: "당신은 Oh My Novelist의 Critic입니다. 객관적이고 건설적인 피드백을 제공하는 전문 리뷰어로, 작품의 강점을 살리고 약점을 보완하는 방향을 제시합니다.",
        objective: "작가의 작품을 분석하여 강점과 개선점을 파악하고, 구체적이고 실행 가능한 수정 방향을 제시합니다. 비판보다 건설적 제안에 중점을 둡니다.",
        contextSections: [
          project ? `현재 프로젝트: ${project}` : "새로운 프로젝트",
          "검토 대상을 파악하고 다각적 분석을 수행합니다."
        ],
        constraints: [
          "비판보다 건설적 제안에 중점",
          "이건 안 좋아요만 하지 말고 이렇게 바꾸면 좋을 것 같아요 제시",
          "주관적 취향보다 객관적 문제점 중심",
          "모든 약점을 지적하지 말고 핵심적인 것만",
          "작가의 의도를 존중하며 제안",
          "칭찬과 비판의 균형 (5:5 또는 6:4)"
        ],
        outputFormat: "마크다운 형식으로 피드백 보고서 작성: 검토 대상, 강점, 개선점(Critical/Recommended/Optional), 종합 평가, 다음 단계 제안"
      },
      {
        userRequest: content
      }
    );

    // 4. Get NovelContext
    const novelContext = context.contextManager.build("critic", project);

    // 5. Call LLM
    const response = await context.llmClient.generate("critic", prompt, novelContext);

    // 6. Handle offline mode - return static fallback
    if (response.degradation === "offline") {
      return this.getStaticFallback(content, project);
    }

    // 7. Record assistant turn
    const assistantEntry: ConversationEntry = {
      role: "assistant",
      agentType: "critic",
      content: response.content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", assistantEntry);

    // 8. Return LLM content
    return response.content;
  }

  private getStaticFallback(content: string, project: string | null): string {
    return `🔍 Critic입니다.

현재 LLM 서비스를 사용할 수 없어 기본 응답을 제공합니다.

**[작가의 입력]**: ${content}

${project ? `**현재 프로젝트**: ${project}` : ""}

작품 분석을 도와드리기 위해 다음 영역을 검토할 수 있습니다:

1. **플롯 논리성**
   - 전개의 자연스러움
   - 인과관계의 타당성
   - 페이싱 적절성

2. **캐릭터 일관성**
   - 행동의 설득력
   - 동기의 명확성
   - 성장의 개연성

3. **대화 자연스러움**
   - 캐릭터별 말투 일관성
   - 서브텍스트 활용
   - 대화의 흐름

4. **세계관 규칙**
   - 설정의 일관성
   - 규칙 준수 여부

5. **전체적 몰입도**
   - 흥미 유발 요소
   - 리듬과 호흡

검토할 내용을 복사해서 붙여주세요. API 키를 설정하면 상세한 피드백 보고서를 받아보실 수 있습니다.`;
  }
}