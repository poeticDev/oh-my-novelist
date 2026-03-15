#!/usr/bin/env python3
"""
Obsidian Vault MCP Server
Obsidian vault와의 통신을 위한 MCP 도구
"""

import json
import sys
import os
from pathlib import Path
from typing import Optional, Dict, Any, List
import re

class ObsidianVaultMCP:
    """Obsidian Vault 통합 MCP 서버"""
    
    def __init__(self, vault_path: str):
        self.vault_path = Path(vault_path).expanduser().resolve()
        if not self.vault_path.exists():
            raise ValueError(f"Vault path does not exist: {vault_path}")
    
    def read_file(self, path: str, include_metadata: bool = False) -> Dict[str, Any]:
        """파일 읽기"""
        file_path = self.vault_path / path
        
        if not file_path.exists():
            return {
                "success": False,
                "error": f"File not found: {path}"
            }
        
        try:
            content = file_path.read_text(encoding='utf-8')
            
            result = {
                "success": True,
                "content": content,
                "path": str(file_path.relative_to(self.vault_path)),
                "last_modified": file_path.stat().st_mtime,
                "word_count": len(content.split())
            }
            
            if include_metadata:
                # Frontmatter 파싱
                frontmatter = self._parse_frontmatter(content)
                result["frontmatter"] = frontmatter
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def write_file(self, path: str, content: str, 
                   frontmatter: Optional[Dict] = None,
                   append: bool = False,
                   create_parents: bool = True) -> Dict[str, Any]:
        """파일 쓰기"""
        file_path = self.vault_path / path
        
        try:
            if create_parents:
                file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Frontmatter 추가
            if frontmatter:
                fm_lines = ["---"]
                for key, value in frontmatter.items():
                    fm_lines.append(f"{key}: {value}")
                fm_lines.append("---")
                fm_lines.append("")
                content = "\n".join(fm_lines) + content
            
            if append and file_path.exists():
                existing = file_path.read_text(encoding='utf-8')
                content = existing + "\n\n" + content
            
            file_path.write_text(content, encoding='utf-8')
            
            return {
                "success": True,
                "path": str(file_path.relative_to(self.vault_path)),
                "word_count": len(content.split())
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def search(self, query: str, path_pattern: Optional[str] = None,
               include_content: bool = False, limit: int = 20) -> Dict[str, Any]:
        """파일 검색"""
        results = []
        
        try:
            search_path = self.vault_path
            if path_pattern:
                # 간단한 패턴 매칭 지원
                parts = path_pattern.split('/')
                for part in parts:
                    if '*' not in part and '?' not in part:
                        search_path = search_path / part
            
            if not search_path.exists():
                return {
                    "success": False,
                    "error": f"Search path does not exist: {search_path}"
                }
            
            # Markdown 파일 검색
            md_files = list(search_path.rglob("*.md"))
            
            for file_path in md_files[:limit]:
                try:
                    content = file_path.read_text(encoding='utf-8')
                    
                    if query.lower() in content.lower():
                        result = {
                            "file": str(file_path.relative_to(self.vault_path)),
                            "line": 0,
                            "snippet": ""
                        }
                        
                        if include_content:
                            # 검색어 주변 컨텍스트 추출
                            lines = content.split('\n')
                            for i, line in enumerate(lines):
                                if query.lower() in line.lower():
                                    result["line"] = i + 1
                                    # 주변 3줄
                                    start = max(0, i - 1)
                                    end = min(len(lines), i + 2)
                                    result["snippet"] = "\n".join(lines[start:end])
                                    break
                        
                        results.append(result)
                        
                except Exception:
                    continue
            
            return {
                "success": True,
                "results": results,
                "total": len(results)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def list_files(self, directory: str = ".") -> Dict[str, Any]:
        """디렉토리 내용 목록"""
        dir_path = self.vault_path / directory
        
        try:
            if not dir_path.exists():
                return {
                    "success": False,
                    "error": f"Directory not found: {directory}"
                }
            
            items = []
            for item in dir_path.iterdir():
                item_info = {
                    "name": item.name,
                    "path": str(item.relative_to(self.vault_path)),
                    "type": "directory" if item.is_dir() else "file"
                }
                
                if item.is_file():
                    stat = item.stat()
                    item_info["size"] = str(stat.st_size)
                    item_info["modified"] = str(stat.st_mtime)
                
                items.append(item_info)
            
            return {
                "success": True,
                "directory": directory,
                "items": items
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _parse_frontmatter(self, content: str) -> Dict[str, Any]:
        """Frontmatter 파싱"""
        frontmatter = {}
        
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                fm_content = parts[1].strip()
                for line in fm_content.split('\n'):
                    if ':' in line:
                        key, value = line.split(':', 1)
                        frontmatter[key.strip()] = value.strip()
        
        return frontmatter


def main():
    """MCP 서버 메인 루프"""
    vault_path = os.environ.get("OBSIDIAN_VAULT_PATH")
    
    if not vault_path:
        print(json.dumps({
            "error": "OBSIDIAN_VAULT_PATH environment variable not set"
        }), file=sys.stderr)
        sys.exit(1)
    
    try:
        mcp = ObsidianVaultMCP(vault_path)
    except ValueError as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
    
    # MCP 서버 루프
    for line in sys.stdin:
        try:
            request = json.loads(line)
            method = request.get("method")
            params = request.get("params", {})
            
            if method == "read":
                result = mcp.read_file(
                    params.get("path"),
                    params.get("include_metadata", False)
                )
            
            elif method == "write":
                result = mcp.write_file(
                    params.get("path"),
                    params.get("content", ""),
                    params.get("frontmatter"),
                    params.get("append", False),
                    params.get("create_parents", True)
                )
            
            elif method == "search":
                result = mcp.search(
                    params.get("query", ""),
                    params.get("path_pattern"),
                    params.get("include_content", False),
                    params.get("limit", 20)
                )
            
            elif method == "list":
                result = mcp.list_files(params.get("directory", "."))
            
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
