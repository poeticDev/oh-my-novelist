# Todo 관리 스킬

## 개요

웹소설 창작 과정을 체계적으로 관리하는 Todo 시스템입니다.

## 기능

### 1. 프로젝트 Todo 생성
새 작품 시작 시 자동으로 Todo 목록 생성:
- 기획 단계 (4개 작업)
- 세계관 설계 (5개 작업)
- 캐릭터 설계 (5개 작업)
- 플롯 구조 (5개 작업)
- 집필 단계 (6개 작업)
- 수정/편집 (5개 작업)

총 30개 기본 작업 + 템플릿별 추가 작업

### 2. 진행 상황 추적
- 전체 진행률 (%) 표시
- 단계별 진행 상황
- 현재 활성 작업 강조

### 3. 에이전트 연동
- 에이전트 작업 완료 시 Todo 자동 업데이트
- 다음 작업 자동 제안
- 단계 완료 시 축하 메시지

### 4. 템플릿 지원
- default: 기본 구조
- fantasy: 종족, 신화 설정 추가
- romance: 로맨스 라인, 케미스트리 추가
- thriller: 미스터리, 반전 포인트 추가

## 사용법

```typescript
// 새 작품 Todo 생성
await tools.todo_manager.create_project_todos({
  project_name: "마법사의 탑",
  template: "fantasy"
})

// 현재 Todo 조회
const todos = await tools.todo_manager.get_current_todos({
  project_name: "마법사의 탑"
})

// Todo 완료 표시
await tools.todo_manager.update_todo_status({
  project_name: "마법사의 탑",
  todo_id: "P001",
  status: "completed",
  notes: "현대 판타지, 2030 직장인 타겟"
})

// 진행 리포트
const report = await tools.todo_manager.get_progress_report({
  project_name: "마법사의 탑"
})
```

## 출력 예시

```
📊 마법사의 탑 - 진행 상황

전체: 30% (9/30 완료)

📋 기획 단계: 100% ✅
  ✅ P001: 장르 및 타겟 독자층 정의
  ✅ P002: 로그라인 작성
  ✅ P003: 핵심 컨셉 확정
  ✅ P004: 작품 톤앤매너 설정

🌍 세계관 설계: 60% 🔄
  ✅ W001: 시대/공간 설정
  ✅ W002: 마법/능력 시스템 정의
  ✅ W003: 사회 구조 설계
  🔄 W004: 역사/신화 작성 (진행중)
  ⏳ W005: 세계관 일관성 검증

👤 캐릭터 설계: 0% ⏳
  ⏳ C001: 주인공 프로필 작성
  ...

📝 현재 작업: W004 역사/신화 작성
💡 다음 추천: W004 완료 후 C001 시작
```
