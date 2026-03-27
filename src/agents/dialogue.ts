import type { BaseAgent, AgentContext } from "./base.js";
import { PromptLoader } from "../prompts/loader.js";
import { PromptBuilder } from "../prompts/builder.js";
import type { AgentType, ConversationEntry } from "../llm/types.js";

export class DialogueAgent implements BaseAgent {
  readonly name = "Dialogue Writer";
  readonly description = "대화 작가";

  async handle(content: string, project: string | null, context: AgentContext): Promise<string> {
    // 1. Record user turn
    const userEntry: ConversationEntry = {
      role: "user",
      agentType: "dialogue",
      content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", userEntry);

    // 2. Load system prompt using PromptLoader
    const promptLoader = new PromptLoader();
    const systemPrompt = promptLoader.load("dialogue");

    // 3. Build scaffold using PromptBuilder
    const promptBuilder = new PromptBuilder(promptLoader);
    const prompt = promptBuilder.build(
      "dialogue",
      {
        role: "당신은 Oh My Novelist의 Dialogue Writer입니다. 캐릭터별 고유 말투와 서브텍스트를 구현하는 대화 작가로, 자연스러운 대화 흐름과 캐릭터 개발을 동시에 달성합니다.",
        objective: "작가의 요청을 분석하여 캐릭터의 성격과 상황에 맞는 자연스러운 대화를 작성합니다. 각 캐릭터의 말투 특징을 유지하며 서브텍스트를 통해 숨은 의미를 전달합니다.",
        contextSections: [
          project ? `현재 프로젝트: ${project}` : "새로운 프로젝트",
          "대화에 참여하는 캐릭터들의 성격과 관계를 파악하고 작성합니다."
        ],
        constraints: [
          "캐릭터별 말투 일관성 유지",
          "서브텍스트 활용 - 말하지 않는 진짜 의미 표현",
          "자연스러운 대화 흐름",
          "한 줄에 한 사람 말하기",
          "말하는 사람의 행동/표정 포함",
          "~라고 말했다보다는 행동으로 대체",
          "반복 피하기"
        ],
        outputFormat: "마크다운 형식으로 대화, 캐릭터별 말투 특징, 핵심 갈등/주제를 포함하여 출력"
      },
      {
        userRequest: content
      }
    );

    // 4. Get NovelContext
    const novelContext = context.contextManager.build("dialogue", project);

    // 5. Call LLM
    const response = await context.llmClient.generate("dialogue", prompt, novelContext);

    // 6. Handle offline mode - return static fallback
    if (response.degradation === "offline") {
      return this.getStaticFallback(content, project);
    }

    // 7. Record assistant turn
    const assistantEntry: ConversationEntry = {
      role: "assistant",
      agentType: "dialogue",
      content: response.content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", assistantEntry);

    // 8. Return LLM content
    return response.content;
  }

  private getStaticFallback(content: string, project: string | null): string {
    return `💬 Dialogue Writer입니다.

현재 LLM 서비스를 사용할 수 없어 기본 응답을 제공합니다.

**[작가의 입력]**: ${content}

${project ? `**현재 프로젝트**: ${project}` : ""}

대화 작성을 도와드리기 위해 다음 정보가 필요합니다:

1. **참여 캐릭터**
   - 누가 대화하나요?
   - 각 캐릭터의 말투 특징은?
   - 캐릭터 간 관계는?

2. **대화 상황**
   - 어떤 장소인가요?
   - 어떤 상황인가요?
   - 대화 전후에 무슨 일이 있었나요?

3. **대화 목적**
   - 이 대화로 전달하려는 것은?
   - 서브텍스트(숨은 의미)가 있나요?
   - 갈등이나 긴장 요소가 있나요?

4. **감정선**
   - 각 캐릭터의 감정 상태는?
   - 대화 중 감정 변화가 있나요?

API 키를 설정하면 캐릭터 특성에 맞는 자연스러운 대화를 받아보실 수 있습니다.`;
  }
}