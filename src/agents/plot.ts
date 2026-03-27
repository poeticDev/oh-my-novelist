import type { BaseAgent, AgentContext } from "./base.js";
import { PromptLoader } from "../prompts/loader.js";
import { PromptBuilder } from "../prompts/builder.js";
import type { AgentType, ConversationEntry } from "../llm/types.js";

export class PlotAgent implements BaseAgent {
  readonly name = "Plot Architect";
  readonly description = "플롯 설계사";

  async handle(content: string, project: string | null, context: AgentContext): Promise<string> {
    // 1. Record user turn
    const userEntry: ConversationEntry = {
      role: "user",
      agentType: "plot",
      content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", userEntry);

    // 2. Load system prompt using PromptLoader
    const promptLoader = new PromptLoader();
    const systemPrompt = promptLoader.load("plot");

    // 3. Build scaffold using PromptBuilder
    const promptBuilder = new PromptBuilder(promptLoader);
    const prompt = promptBuilder.build(
      "plot",
      {
        role: "당신은 Oh My Novelist의 Plot Architect입니다. 스토리 구조 전문가로, 3막 구조, 히어로즈 저니, 스노우플레이크 등 다양한 플롯 모델을 웹소설에 맞게 변형하여 사용합니다.",
        objective: "작가의 요청을 분석하여 전체 아크, 회차별 개요, 훅 배치, 서브플롯 통합, 클리맥스 설계를 포함한 체계적인 플롯 구조를 제공합니다.",
        contextSections: [
          project ? `현재 프로젝트: ${project}` : "새로운 프로젝트",
          "작가의 요청을 분석하여 플롯 구조를 설계합니다."
        ],
        constraints: [
          "모든 회차는 '왜 필요한가?'에 답할 수 있어야 함",
          "훅은 인위적이지 않고 자연스럽게 배치",
          "캐릭터의 선택이 플롯을 움직여야 함 (플롯이 캐릭터를 끌고 가면 안 됨)",
          "중간에 루즈해지는 구간 없이 밀도 유지",
          "결말은 초반의 약속을 지켜야 함"
        ],
        outputFormat: "마크다운 형식으로 전체 구조(3막), 회차별 개요, 훅 배치표, 주의사항을 포함하여 출력"
      },
      {
        userRequest: content
      }
    );

    // 4. Get NovelContext
    const novelContext = context.contextManager.build("plot", project);

    // 5. Call LLM
    const response = await context.llmClient.generate("plot", prompt, novelContext);

    // 6. Handle offline mode - return static fallback
    if (response.degradation === "offline") {
      return this.getStaticFallback(content, project);
    }

    // 7. Record assistant turn
    const assistantEntry: ConversationEntry = {
      role: "assistant",
      agentType: "plot",
      content: response.content,
      timestamp: new Date().toISOString()
    };
    context.contextManager.recordTurn(project ?? "default", assistantEntry);

    // 8. Return LLM content
    return response.content;
  }

  private getStaticFallback(content: string, project: string | null): string {
    return `📊 Plot Architect입니다.

현재 LLM 서비스를 사용할 수 없어 기본 응답을 제공합니다.

**[작가의 입력]**: ${content}

${project ? `**현재 프로젝트**: ${project}` : ""}

플롯 구조 설계를 도와드리기 위해 다음 단계를 제안합니다:

1. **기본 정보 수집**
   - 장르 및 컨셉
   - 목표 회차수 (50화/100화/200화 등)
   - 주요 캐릭터들의 목표와 갈등
   - 세계관의 제약과 가능성
   - 핵심 주제/메시지

2. **3막 구조 설계**
   - 1막 (설정, 약 25%): 평범한 세계, 인시팅 인시던트, 1문
   - 2막 (대립, 약 50%): 시험과 적, 중간점, 악전고투, 2문
   - 3막 (해결, 약 25%): 부활, 최종 대결, 귀환

3. **회차별 개요**
   - 초반 (1~10화): 세계관/캐릭터 소개, 인시팅 인시던트, 첫 훅
   - 중반 (11~30화): 갈등 심화, 관계 형성/변화, 중간점
   - 후반 (31~50화): 위기 고조, 클리맥스, 결말

4. **훅(Hook) 설계**
   - 질문 훅: "왜?", "누가?", "무슨 일이?"
   - 감정 훅: 공감, 분노, 호기심
   - 상황 훅: 위기, 기회, 반전
   - 관계 훅: 만남, 이별, 배신, 진실

5. **서브플롯 통합**
   - 로맨스 서브플롯: 메인 플롯과 연결 지점
   - 성장 서브플롯: 능력/성격 성장
   - 미스터리 서브플롯: 단서 배치, 진실 공개 타이밍

API 키를 설정하면 더 상세한 플롯 설계를 받아보실 수 있습니다.`;
  }
}