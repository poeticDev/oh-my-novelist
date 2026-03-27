import type { BaseAgent, AgentContext } from "./base.js";
import { PromptLoader } from "../prompts/loader.js";
import { PromptBuilder } from "../prompts/builder.js";
import type { AgentType, ConversationEntry } from "../llm/types.js";

export class SceneAgent implements BaseAgent {
  readonly name = "Scene Writer";
  readonly description = "장면 작가";

  async handle(content: string, project: string | null, context: AgentContext): Promise<string> {
    // 1. Record user turn
    const userEntry: ConversationEntry = {
      role: "user",
      agentType: "scene",
      content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", userEntry);

    // 2. Load system prompt using PromptLoader
    const promptLoader = new PromptLoader();
    const systemPrompt = promptLoader.load("scene");

    // 3. Build scaffold using PromptBuilder
    const promptBuilder = new PromptBuilder(promptLoader);
    const prompt = promptBuilder.build(
      "scene",
      {
        role: "당신은 Oh My Novelist의 Scene Writer입니다. 생생한 장면 묘사와 분위기 연출에 특화된 작가로, Show Don't Tell 원칙을 철저히 따르며 감각적 디테일을 통해 독자를 현장으로 이끕니다.",
        objective: "작가의 요청을 분석하여 생생한 장면을 작성합니다. 시각, 청각, 후각, 촉각, 미각을 활용한 감각적 묘사와 분위기 연출을 통해 독자가 현장에 있는 듯한 경험을 제공합니다.",
        contextSections: [
          project ? `현재 프로젝트: ${project}` : "새로운 프로젝트",
          "장면의 배경, 분위기, 핵심 디테일을 명확히 파악하고 작성합니다."
        ],
        constraints: [
          "Show, Don't Tell 원칙 준수 - 직접 설명보다 묘사로 보여주기",
          "감각 활용 - 시각, 청각, 후각, 촉각, 미각 적극 활용",
          "분위기 설정 - 장면의 감정적 톤을 명확히 전달",
          "리듬 조절 - 긴장/느긋함에 따른 문장 길이 조절",
          "핵심 디테일 강조 - 독자가 기억할 만한 부분 부각"
        ],
        outputFormat: "마크다운 형식으로 장면 묘사, 배경(장소/시간/날씨), 분위기(감정적 톤), 핵심 디테일을 포함하여 출력"
      },
      {
        userRequest: content
      }
    );

    // 4. Get NovelContext
    const novelContext = context.contextManager.build("scene", project);

    // 5. Call LLM
    const response = await context.llmClient.generate("scene", prompt, novelContext);

    // 6. Handle offline mode - return static fallback
    if (response.degradation === "offline") {
      return this.getStaticFallback(content, project);
    }

    // 7. Record assistant turn
    const assistantEntry: ConversationEntry = {
      role: "assistant",
      agentType: "scene",
      content: response.content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", assistantEntry);

    // 8. Return LLM content
    return response.content;
  }

  private getStaticFallback(content: string, project: string | null): string {
    return `✍️ Scene Writer입니다.

현재 LLM 서비스를 사용할 수 없어 기본 응답을 제공합니다.

**[작가의 입력]**: ${content}

${project ? `**현재 프로젝트**: ${project}` : ""}

장면 작성을 도와드리기 위해 다음 정보가 필요합니다:

1. **장면 배경**
   - 장소는 어디인가요?
   - 시간대는 언제인가요?
   - 날씨나 분위기는 어떤가요?

2. **등장인물**
   - 누가 장면에 있나요?
   - 각자의 위치와 행동은?

3. **핵심 사건**
   - 이 장면에서 무슨 일이 일어나나요?
   - 어떤 감정이 표현되어야 하나요?

4. **감각적 디테일**
   - 시각: 무엇이 보이나요?
   - 청각: 어떤 소리가 들리나요?
   - 후각/촉각: 어떤 감각이 있나요?

API 키를 설정하면 생생한 장면 묘사를 받아보실 수 있습니다.`;
  }
}