import type { BaseAgent, AgentContext } from "./base.js";
import { PromptLoader } from "../prompts/loader.js";
import { PromptBuilder } from "../prompts/builder.js";
import type { AgentType, ConversationEntry } from "../llm/types.js";

export class CharacterAgent implements BaseAgent {
  readonly name = "Character Designer";
  readonly description = "캐릭터 디자이너";

  async handle(content: string, project: string | null, context: AgentContext): Promise<string> {
    // 1. Record user turn
    const userEntry: ConversationEntry = {
      role: "user",
      agentType: "character",
      content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", userEntry);

    // 2. Load system prompt using PromptLoader
    const promptLoader = new PromptLoader();
    const systemPrompt = promptLoader.load("character");

    // 3. Build scaffold using PromptBuilder
    const promptBuilder = new PromptBuilder(promptLoader);
    const prompt = promptBuilder.build(
      "character",
      {
        role: "당신은 Oh My Novelist의 Character Designer입니다. 12년 경력의 캐릭터 디자인 전문가로, 드라마, 영화, 웹소설, 게임 등 다양한 매체에서 200명 이상의 캐릭터를 디자인했습니다.",
        objective: "작가의 요청을 분석하여 입체적이고 기억에 남는 캐릭터를 창조합니다. 애니어그램 분석, 성장 아크 설계, 관계도 구축, 대화 스타일 정의를 포함합니다.",
        contextSections: [
          project ? `현재 프로젝트: ${project}` : "새로운 프로젝트",
          "작가의 요청을 분석하여 캐릭터를 설계합니다."
        ],
        constraints: [
          "반드시 애니어그램 분석 포함 (번호, 날개, 하위욕구)",
          "표면적 목표와 숨겨진 동기를 명확히 구분",
          "성장 아크는 구체적이고 믿을 수 있게 설계",
          "대화 예시는 실제 문장으로 작성",
          "관계는 단순히 '친구'가 아닌 '어떤 친구인지' 구체화",
          "외형은 시각적으로 묘사 가능하게 작성"
        ],
        outputFormat: "마크다운 형식으로 기본 프로필, 외형, 성격 유형(애니어그램), 배경, 동기, 관계, 성장 아크, 대화 스타일, 캐릭터 노트를 포함하여 출력"
      },
      {
        userRequest: content
      }
    );

    // 4. Get NovelContext
    const novelContext = context.contextManager.build("character", project);

    // 5. Call LLM
    const response = await context.llmClient.generate("character", prompt, novelContext);

    // 6. Handle offline mode - return static fallback
    if (response.degradation === "offline") {
      return this.getStaticFallback(content, project);
    }

    // 7. Record assistant turn
    const assistantEntry: ConversationEntry = {
      role: "assistant",
      agentType: "character",
      content: response.content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", assistantEntry);

    // 8. Return LLM content
    return response.content;
  }

  private getStaticFallback(content: string, project: string | null): string {
    return `👤 Character Designer입니다.

현재 LLM 서비스를 사용할 수 없어 기본 응답을 제공합니다.

**[작가의 입력]**: ${content}

${project ? `**현재 프로젝트**: ${project}` : ""}

캐릭터 설계를 도와드리기 위해 다음 단계를 제안합니다:

1. **기본 정보 수집**
   - 이름 (임시라도 상관없음)
   - 나이/성별/직업
   - 간단한 캐릭터 이미지 (키워드 3~5개)
   - 작품 내 역할 (주인공/조연/악역)

2. **애니어그램 분석**
   - 핵심 유형 (1-9 중 하나)
   - 날개 (양 옆 숫자 중 하나)
   - 하위욕구 순서 (SP/SO/SX)

3. **심층 캐릭터 설계**
   - 외형 (신체적 특징, 스타일, 첫인상)
   - 성격 (표면적 특성 vs 숨겨진 특성)
   - 배경 (출신, 결정적 사건, 현재 상황)
   - 동기 (표면적 목표 vs 숨겨진 동기)

4. **성장 아크 설계**
   - 1막 (시작): 현재 상태, 거짓 믿음
   - 2막 (성장): 시련, 낮은 순간, 깨달음
   - 3막 (완성): 변화된 모습, 새로운 믿음

5. **대화 스타일 정의**
   - 기본 말투
   - 감정별 차이
   - 자주 쓰는 말버릇
   - 비언어적 특징

API 키를 설정하면 더 상세한 캐릭터 설계를 받아보실 수 있습니다.`;
  }
}