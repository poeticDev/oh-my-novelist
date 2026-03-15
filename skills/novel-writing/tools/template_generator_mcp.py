#!/usr/bin/env python3
"""
Template Generator MCP Server
웹소설 프로젝트 템플릿 생성 MCP 도구
"""

import json
import sys
import os
import re
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

class TemplateGeneratorMCP:
    """템플릿 생성 MCP 서버"""
    
    def __init__(self, templates_dir: str):
        self.templates_dir = Path(templates_dir).expanduser().resolve()
    
    def generate_project(self, project_name: str, template: str = "default",
                        output_path: str = "~/Documents/novels") -> Dict[str, Any]:
        """새 프로젝트 생성"""
        try:
            # 출력 경로 설정
            output_dir = Path(output_path).expanduser() / self._sanitize_filename(project_name)
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # 템플릿 구조 가져오기
            structure = self._get_structure(template)
            
            created_files = []
            
            # 디렉토리 구조 생성
            for dir_name in structure.get("directories", []):
                dir_path = output_dir / dir_name
                dir_path.mkdir(parents=True, exist_ok=True)
            
            # 기본 파일 생성
            for file_info in structure.get("files", []):
                file_path = output_dir / file_info["path"]
                content = self._generate_content(file_info, project_name, template)
                
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(content, encoding='utf-8')
                
                created_files.append(str(file_path.relative_to(output_dir)))
            
            return {
                "success": True,
                "project_path": str(output_dir),
                "project_name": project_name,
                "template": template,
                "created_files": created_files,
                "structure": structure.get("directories", [])
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def list_templates(self) -> Dict[str, Any]:
        """사용 가능한 템플릿 목록"""
        templates = {
            "default": {
                "name": "기본 템플릿",
                "description": "표준 웹소설 구조",
                "phases": ["기획", "세계관", "캐릭터", "플롯", "집필", "편집"]
            },
            "fantasy": {
                "name": "판타지 템플릿",
                "description": "판타지 세계관 중심 구조",
                "phases": ["기획", "세계관(확장)", "캐릭터", "플롯", "집필", "편집"],
                "features": ["종족 설정", "신화 작성", "마법 시스템"]
            },
            "romance": {
                "name": "로맨스 템플릿",
                "description": "로맨스 및 관계 중심 구조",
                "phases": ["기획", "세계관", "캐릭터(확장)", "플롯", "집필", "편집"],
                "features": ["로맨스 라인", "케미스트리 포인트", "감정 곡선"]
            },
            "thriller": {
                "name": "스릴러 템플릿",
                "description": "미스터리 및 긴장감 중심 구조",
                "phases": ["기획", "세계관", "캐릭터", "플롯(확장)", "집필", "편집"],
                "features": ["미스터리 요소", "반전 포인트", "단서 배치"]
            }
        }
        
        return {
            "success": True,
            "templates": templates
        }
    
    def _get_structure(self, template: str) -> Dict[str, Any]:
        """템플릿 구조 가져오기"""
        
        # 기본 디렉토리 구조
        base_directories = [
            "concept",
            "world",
            "characters",
            "plot",
            "episodes",
            "exports"
        ]
        
        # 기본 파일 구조
        base_files = [
            {
                "path": "README.md",
                "template": "project_readme"
            },
            {
                "path": "concept/logline.md",
                "template": "logline"
            },
            {
                "path": "concept/synopsis.md",
                "template": "synopsis"
            },
            {
                "path": "world/setting.md",
                "template": "world_setting"
            },
            {
                "path": "world/rules.md",
                "template": "world_rules"
            },
            {
                "path": "characters/protagonist.md",
                "template": "character_sheet"
            },
            {
                "path": "plot/structure.md",
                "template": "plot_structure"
            },
            {
                "path": "episodes/outline.md",
                "template": "episode_outline"
            }
        ]
        
        # 템플릿별 추가 파일
        template_additions = {
            "fantasy": [
                {"path": "world/races.md", "template": "fantasy_races"},
                {"path": "world/mythology.md", "template": "fantasy_mythology"}
            ],
            "romance": [
                {"path": "characters/romance_line.md", "template": "romance_line"},
                {"path": "plot/chemistry_points.md", "template": "chemistry_points"}
            ],
            "thriller": [
                {"path": "plot/mystery_elements.md", "template": "thriller_mystery"},
                {"path": "plot/twist_points.md", "template": "thriller_twists"}
            ]
        }
        
        files = base_files.copy()
        if template in template_additions:
            files.extend(template_additions[template])
        
        return {
            "directories": base_directories,
            "files": files
        }
    
    def _generate_content(self, file_info: Dict, project_name: str, template: str) -> str:
        """파일 내용 생성"""
        template_type = file_info.get("template", "empty")
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        contents = {
            "project_readme": f"""# {project_name}

## 프로젝트 개요
- **작품명**: {project_name}
- **템플릿**: {template}
- **생성일**: {current_date}

## 폴더 구조
- **concept/**: 기획 문서 (로그라인, 시놉시스 등)
- **world/**: 세계관 설정 (배경, 규칙, 역사 등)
- **characters/**: 캐릭터 프로필
- **plot/**: 플롯 구조 (3막, 훅, 아크 등)
- **episodes/**: 회차별 원고
- **exports/**: 낸내기 파일

## 시작하기
1. `concept/logline.md`에 로그라인 작성
2. `world/setting.md`에 세계관 설정
3. `characters/protagonist.md`에 주인공 프로필
4. 플롯 구조 설계 후 집필 시작

---
*Oh My Novelist로 생성된 프로젝트*
""",
            
            "logline": f"""# 로그라인

## {project_name}

[주인공]은 [목표]를 위해 [행동]하지만 [장애물]이 있다.

### 옵션 A
(여기에 첫 번째 로그라인 버전을 작성하세요)

### 옵션 B
(여기에 두 번째 로그라인 버전을 작성하세요)

### 옵션 C  
(여기에 세 번째 로그라인 버전을 작성하세요)

---

**확정된 로그라인**: 

**장르**: 
**타겟 독자층**: 
""",
            
            "synopsis": f"""# 시놉시스

## {project_name}

### 한 줄 요약
(로그라인을 복사하세요)

### 3줄 요약
1. (시작: 주인공의 현실)
2. (전환: 변화의 계기)
3. (목표: 무엇을 이루려 하는가)

### 긴 요약 (10줄)
1. 
2. 
3. 
4. 
5. 
6. 
7. 
8. 
9. 
10. 

### 핵심 테마
- 
- 
- 

### 차별화 포인트
- 
- 
""",
            
            "world_setting": """# 세계관 설정

## 기본 정보

### 시대/공간
- **시대**: 
- **장소**: 
- **시간**: 현재 [연도]

### 세계관 한 줄 요약
(이 세계는 현실과 어떻게 다른가?)

## 지리/환경

### 주요 지역
1. **지역명**: 설명
2. **지역명**: 설명

### 기후/환경
- 

## 물리적 법칙

### 마법/능력 시스템 (해당 시)
- **원리**: 
- **희소성**: 
- **대가**: 
- **제약**: 

### 기술 수준
- 현대와 비교: 
- 고유 기술: 

---
*세계관 바이블의 핵심만 정리*
""",
            
            "world_rules": """# 세계관 규칙

## 핵심 규칙

### 규칙 1: [이름]
- **설명**: 
- **영향**: 
- **예외**: 

### 규칙 2: [이름]
- **설명**: 
- **영향**: 
- **예외**: 

## 사회 구조

### 정치
- 통치 체제: 
- 권력 분배: 

### 경제
- 화폐: 
- 주요 산업: 

### 문화
- 언어: 
- 종교: 
- 관습: 

## 갈등 구조

### 사회적 갈등
- 

### 주인공과의 관계
- 주인공의 위치: 
- 세계관이 주는 제약: 

---
*일관성 유지를 위한 규칙 정리*
""",
            
            "character_sheet": """# 캐릭터 프로필

## 기본 정보
- **이름**: 
- **나이**: 
- **성별**: 
- **직업/신분**: 
- **외모**: 

## 성격

### 장점 3가지
1. 
2. 
3. 

### 단점 3가지
1. 
2. 
3. 

## 배경

### 출신/가족
- 

### 결정적 과거
- 

## 욕망

### 표면적 목표
- 

### 진짜 원하는 것
- 

### 목표를 원하는 이유
- 

## 갈등

### 내부 갈등
- 

### 외부 갈등
- 

## 성장

### 이야기 시작 시
- 

### 이야기 끝에서
- 

### 변화 과정
- 

## 관계

### 주인공과의 관계
- 

### 다른 캐릭터와의 관계
- [이름]: 

## 말투/행동

### 어휘/말투
- 

### 습관/버릇
- 

### 대화 예시
- 화날 때: 
- 슬플 때: 
- 기쁠 때: 

---
*캐릭터 일관성 유지용*
""",
            
            "plot_structure": """# 플롯 구조

## 전체 아크

### 3막 구조
- **제1막 (설정)**: ~25%
- **제2막 (대립)**: ~50%
- **제3막 (결말)**: ~25%

## 제1막: 설정

### 오프닝
- 목적: 
- 훅: 

### 인시던트 (사건)
- 무슨 일: 
- 주인공 반응: 

### 전환점 1
- 선택: 
- 결과: 

## 제2막: 대립

### 적응
- 새로운 세계: 
- 동료 만남: 

### 중간점
- 반전: 
- 깨달음: 

### 악화
- 장애물: 
- 희생: 

### 위기
- 최저점: 
- 포기 직전: 

## 제3막: 결말

### 각성
- 결심: 
- 힘 발견: 

### 결전
- 최종 대결: 
- 해결: 

### 결말
- 새로운 일상: 
- 여운: 

---
*회차별 개요는 별도 파일로*
""",
            
            "episode_outline": """# 회차별 개요

## Episode 1: [제목]

### 목표
(이 회차에서 달성할 것)

### 훅
- 시작: 
- 끝: 

### 내용
1. 
2. 
3. 

### 등장인물
- 

---

## Episode 2: [제목]

### 목표

### 훅

### 내용

### 등장인물

---

*각 회차별로 복사하여 작성*
""",
            
            # 판타지 추가 템플릿
            "fantasy_races": """# 종족 설정

## 종족 1: [이름]

### 외형
- 

### 특성
- 능력: 
- 수명: 
- 약점: 

### 사회
- 거주지: 
- 문화: 

### 역사
- 

---

## 종족 2: [이름]

*위와 동일한 구조로*
""",
            
            "fantasy_mythology": """# 신화/전설

## 창세 신화

### 세계의 시작
- 

### 최초의 존재
- 

## 영웅 전설

### 영웅 1
- 이름: 
- 업적: 
- 의미: 

## 종말 예언

### 내용
- 

### 현재와의 관계
- 
""",
            
            # 로맨스 추가 템플릿
            "romance_line": """# 로맨스 라인

## 관계 발전 단계

### 1단계: 첫 만남
- 상황: 
- 첫 인상: 

### 2단계: 호감
- 계기: 
- 변화: 

### 3단계: 갈등
- 원인: 
- 해결: 

### 4단계: 확인
- 순간: 
- 표현: 

### 5단계: 결말
- 형태: 

---

## 로맨스 훅

### 당겨짐 순간
- 

### 밀어냄 순간
- 

### 키스신/클라이맥스
- 
""",
            
            "chemistry_points": """# 케미스트리 포인트

## 공통점
- 

## 상호보완
- 주인공의 부족함을 상대방이 채워줌: 
- 상대방의 부족함을 주인공이 채워줌: 

## 긴장감 요소
- 

## 귀여움/재미 포인트
- 
""",
            
            # 스릴러 추가 템플릿
            "thriller_mystery": """# 미스터리 요소

## 핵심 미스터리
- 질문: 
- 정답: 

## 단서 배치

### 단서 1
- 위치: 
- 의미: 

### 단서 2
- 위치: 
- 의미: 

## 오해/거짓 단서
- 

## 해결 방법
- 누가: 
- 어떻게: 
- 언제: 
""",
            
            "thriller_twists": """# 반전 포인트

## 반전 1
- 위치: 
- 내용: 
- 포shadowing: 

## 반전 2
- 위치: 
- 내용: 
- 포shadowing: 

## 최종 반전
- 위치: 
- 내용: 
- 의미: 

---

*독자가 예측하지 못하지만, 보면 납득할 수 있는 반전*
""",
            
            "empty": ""
        }
        
        return contents.get(template_type, f"# {file_info.get('path', 'New File')}\n\n(내용을 작성하세요)")
    
    def _sanitize_filename(self, name: str) -> str:
        """파일명 정제"""
        # 특수문자 제거
        sanitized = re.sub(r'[<>:"/\\\\|?*]', '', name)
        # 공백을 하이픈으로
        sanitized = sanitized.replace(' ', '-')
        return sanitized


def main():
    """MCP 서버 메인 루프"""
    templates_dir = os.environ.get("NOVEL_TEMPLATES_DIR", "./templates")
    
    try:
        mcp = TemplateGeneratorMCP(templates_dir)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
    
    # MCP 서버 루프
    for line in sys.stdin:
        try:
            request = json.loads(line)
            method = request.get("method")
            params = request.get("params", {})
            
            if method == "generate":
                result = mcp.generate_project(
                    params.get("project_name", "untitled"),
                    params.get("template", "default"),
                    params.get("output_path", "~/Documents/novels")
                )
            
            elif method == "list":
                result = mcp.list_templates()
            
            else:
                result = {
                    "success": False,
                    "error": f"Unknown method: {method}"
                }
            
            print(json.dumps(result))
            sys.stdout.flush()
            
        except json.JSONDecodeError:
            print(json.dumps({
                "success": False,
                "error": "Invalid JSON"
            }))
            sys.stdout.flush()
        
        except Exception as e:
            print(json.dumps({
                "success": False,
                "error": str(e)
            }))
            sys.stdout.flush()


if __name__ == "__main__":
    main()
