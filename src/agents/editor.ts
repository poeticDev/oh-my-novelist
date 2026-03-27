import type { BaseAgent, AgentContext } from "./base.js";
import { PromptLoader } from "../prompts/loader.js";
import { PromptBuilder } from "../prompts/builder.js";
import type { AgentType, ConversationEntry } from "../llm/types.js";

export class EditorAgent implements BaseAgent {
  readonly name = "Editor";
  readonly description = "편집자";

  async handle(content: string, project: string | null, context: AgentContext): Promise<string> {
    // 1. Record user turn
    const userEntry: ConversationEntry = {
      role: "user",
      agentType: "editor",
      content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", userEntry);

    // 2. Load system prompt using PromptLoader
    const promptLoader = new PromptLoader();
    const systemPrompt = promptLoader.load("editor");

    // 3. Build scaffold using PromptBuilder
    const promptBuilder = new PromptBuilder(promptLoader);
    const prompt = promptBuilder.build(
      "editor",
      {
        role: "당신은 Oh My Novelist의 Editor입니다. 텍스트를 다듬는 편집자로, 문장력과 스타일 통일에 특화되어 있습니다. 작가의 목소리는 유지하며 읽기 편하게 만듭니다.",
        objective: "작가의 텍스트를 분석하여 문장 교정, 간결화, 리듬 개선, 일관성 확보를 수행합니다. 불필요한 단어를 제거하고 문장의 호흡을 조절합니다.",
        contextSections: [
          project ? `현재 프로젝트: ${project}` : "새로운 프로젝트",
          "편집할 텍스트를 분석하고 개선 방향을 파악합니다."
        ],
        constraints: [
          "간결함 - 불필요한 단어 제거",
          "리듬 - 문장 길이와 호흡 조절",
          "일관성 - 인칭, 시제, 톤 유지",
          "문법 - 오탈자 및 문법 교정",
          "중복 표현 제거",
          "긴 문장 단순화",
          "수동태 능동태로",
          "~하다 → 구체적 동사"
        ],
        outputFormat: "마크다운 형식으로 교정된 텍스트와 주요 수정사항(수정 내용과 이유)을 포함하여 출력"
      },
      {
        userRequest: content
      }
    );

    // 4. Get NovelContext
    const novelContext = context.contextManager.build("editor", project);

    // 5. Call LLM
    const response = await context.llmClient.generate("editor", prompt, novelContext);

    // 6. Handle offline mode - return static fallback
    if (response.degradation === "offline") {
      return this.getStaticFallback(content, project);
    }

    // 7. Record assistant turn
    const assistantEntry: ConversationEntry = {
      role: "assistant",
      agentType: "editor",
      content: response.content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", assistantEntry);

    // 8. Return LLM content
    return response.content;
  }

  private getStaticFallback(content: string, project: string | null): string {
    return `✏️ Editor입니다.

현재 LLM 서비스를 사용할 수 없어 기본 응답을 제공합니다.

**[작가의 입력]**: ${content}

${project ? `**현재 프로젝트**: ${project}` : ""}

편집 작업을 도와드리기 위해 다음 영역을 지원합니다:

1. **문장 간결화**
   - 불필요한 단어 제거
   - 긴 문장 단순화
   - 중복 표현 정리

2. **문법 교정**
   - 오탈자 수정
   - 문법 오류 교정
   - 맞춤법 확인

3. **문체 일관성**
   - 인칭 통일
   - 시제 일관성
   - 톤앤매너 유지

4. **리듬 개선**
   - 문장 길이 조절
   - 호흡 조절
   - 가독성 향상

5. **표현 개선**
   - 수동태 → 능동태
   - 추상적 표현 → 구체적 표현
   - "~하다" → 구체적 동사

편집할 내용을 복사해서 붙여주세요. API 키를 설정하면 전문적인 편집 결과를 받아보실 수 있습니다.`;
  }
}