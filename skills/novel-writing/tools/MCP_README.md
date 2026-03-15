# MCP Tools for Oh My Novelist

Model Context Protocol (MCP) 도구들 - Oh My Novelist 플러그인의 핵심 기능

## 개요

MCP(Model Context Protocol)는 AI 에이전트가 외부 도구와 상호작용할 수 있게 하는 표준 프로토콜입니다.

## 도구 목록

### 1. Obsidian Vault MCP (`obsidian_vault_mcp.py`)

**기능**: Obsidian vault와의 읽기/쓰기/검색

**환경 변수**:
```bash
export OBSIDIAN_VAULT_PATH="~/Obsidian/MyVault"
```

**메서드**:
- `read`: 파일 읽기 (frontmatter 포함 가능)
- `write`: 파일 쓰기 (frontmatter 자동 추가)
- `search`: vault 전체 검색
- `list`: 디렉토리 목록

**사용 예시**:
```python
# 파일 읽기
{
  "method": "read",
  "params": {
    "path": "04_novel/works/my-novel/concept.md",
    "include_metadata": true
  }
}

# 파일 쓰기
{
  "method": "write",
  "params": {
    "path": "04_novel/works/my-novel/characters/hero.md",
    "content": "# 주인공\n\n이름: 김민수...",
    "frontmatter": {
      "created": "2024-01-15",
      "status": "draft"
    }
  }
}

# 검색
{
  "method": "search",
  "params": {
    "query": "마법",
    "include_content": true,
    "limit": 10
  }
}
```

### 2. Template Generator MCP (`template_generator_mcp.py`)

**기능**: 새 프로젝트 템플릿 생성

**환경 변수**:
```bash
export NOVEL_TEMPLATES_DIR="./templates"
```

**메서드**:
- `generate`: 새 프로젝트 생성
- `list`: 사용 가능한 템플릿 목록

**템플릿 종류**:
- **default**: 기본 구조 (30개 작업)
- **fantasy**: 판타지 (종족, 신화 설정 추가)
- **romance**: 로맨스 (로맨스 라인, 케미스트리 추가)
- **thriller**: 스릴러 (미스터리, 반전 포인트 추가)

**사용 예시**:
```python
# 프로젝트 생성
{
  "method": "generate",
  "params": {
    "project_name": "마법사의 탑",
    "template": "fantasy",
    "output_path": "~/Documents/novels"
  }
}

# 템플릿 목록
{
  "method": "list"
}
```

### 3. Todo Manager MCP (`todo-manager.yaml`)

**기능**: 창작 과정 Todo 관리

**메서드**:
- `create_project_todos`: 새 작업 Todo 생성
- `get_current_todos`: 현재 Todo 조회
- `update_todo_status`: Todo 상태 업데이트
- `add_custom_todo`: 커스텀 Todo 추가
- `get_progress_report`: 진행 리포트

**사용 예시**:
```python
# Todo 생성
{
  "method": "create_project_todos",
  "params": {
    "project_name": "마법사의 탑",
    "template": "fantasy"
  }
}

# 상태 업데이트
{
  "method": "update_todo_status",
  "params": {
    "project_name": "마법사의 탑",
    "todo_id": "P001",
    "status": "completed",
    "notes": "현대 판타지로 확정"
  }
}
```

## 설치

### 1. Python 의존성

```bash
pip install -r requirements.txt
```

### 2. 환경 변수 설정

```bash
# .zshrc 또는 .bashrc에 추가
export OBSIDIAN_VAULT_PATH="~/Obsidian/MyVault"
export NOVEL_TEMPLATES_DIR="~/projects/oh-my-novelist/templates"
```

### 3. 실행 권한 부여

```bash
chmod +x skills/novel-writing/tools/*.py
```

## 스킬 정의 연동

`../skill.yaml`에 MCP 서버 등록:

```yaml
mcp:
  obsidian-vault:
    command: python
    args: ["./tools/obsidian_vault_mcp.py"]
    env:
      OBSIDIAN_VAULT_PATH: "${OBSIDIAN_VAULT_PATH}"
  
  template-generator:
    command: python
    args: ["./tools/template_generator_mcp.py"]
    env:
      NOVEL_TEMPLATES_DIR: "${NOVEL_TEMPLATES_DIR}"
```

## 테스트

```bash
# Obsidian Vault MCP 테스트
echo '{"method": "list", "params": {"directory": "."}}' | python obsidian_vault_mcp.py

# Template Generator MCP 테스트
echo '{"method": "list"}' | python template_generator_mcp.py
```

## 문제 해결

### Vault 경로 오류
```
Error: Vault path does not exist
```
→ `OBSIDIAN_VAULT_PATH` 환경 변수 확인

### 파일 쓰기 권한 오류
→ Vault 폴터의 쓰기 권한 확인

### 한글 인코딩 오류
→ Python 3.8+ 사용, UTF-8 인코딩 확인
