import { describe, it, expect, beforeEach } from 'vitest';
import { PromptBuilder } from '../../src/prompts/builder.js';
import { PromptLoader } from '../../src/prompts/loader.js';
import type { PromptScaffold, PromptVariables } from '../../src/prompts/types.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('PromptBuilder', () => {
  let tempDir: string;
  let loader: PromptLoader;
  let builder: PromptBuilder;

  beforeEach(() => {
    tempDir = join(tmpdir(), `prompt-builder-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    loader = new PromptLoader(tempDir);
    builder = new PromptBuilder(loader);
  });

  describe('build', () => {
    it('should compose scaffold + instructions into system prompt', () => {
      const agentInstructions = 'These are the agent instructions.';
      writeFileSync(join(tempDir, 'test-agent.md'), agentInstructions);

      const scaffold: PromptScaffold = {
        role: 'Test Role',
        objective: 'Test Objective',
        contextSections: ['Section 1', 'Section 2'],
        constraints: ['Constraint 1', 'Constraint 2'],
        outputFormat: 'Output format here',
      };

      const variables: PromptVariables = {
        userRequest: 'Test user request',
      };

      const result = builder.build('test-agent', scaffold, variables);

      expect(result.system).toContain('# Role');
      expect(result.system).toContain('Test Role');
      expect(result.system).toContain('# Objective');
      expect(result.system).toContain('Test Objective');
      expect(result.system).toContain('# Context');
      expect(result.system).toContain('# Constraints');
      expect(result.system).toContain('- Constraint 1');
      expect(result.system).toContain('# Output Format');
      expect(result.system).toContain('# Agent Instructions');
      expect(result.system).toContain(agentInstructions);
    });

    it('should use variables.userRequest as user prompt', () => {
      writeFileSync(join(tempDir, 'user-test.md'), 'Instructions');

      const scaffold: PromptScaffold = {
        role: 'Role',
        objective: 'Objective',
        contextSections: [],
        constraints: [],
        outputFormat: 'Format',
      };

      const variables: PromptVariables = {
        userRequest: 'My specific request',
      };

      const result = builder.build('user-test', scaffold, variables);

      expect(result.user).toBe('My specific request');
    });

    it('should include tone section when provided', () => {
      writeFileSync(join(tempDir, 'tone-test.md'), 'Instructions');

      const scaffold: PromptScaffold = {
        role: 'Role',
        objective: 'Objective',
        contextSections: [],
        constraints: [],
        outputFormat: 'Format',
        tone: 'Professional and friendly',
      };

      const variables: PromptVariables = {
        userRequest: 'Request',
      };

      const result = builder.build('tone-test', scaffold, variables);

      expect(result.system).toContain('# Tone');
      expect(result.system).toContain('Professional and friendly');
    });

    it('should omit tone section when not provided', () => {
      writeFileSync(join(tempDir, 'no-tone-test.md'), 'Instructions');

      const scaffold: PromptScaffold = {
        role: 'Role',
        objective: 'Objective',
        contextSections: [],
        constraints: [],
        outputFormat: 'Format',
      };

      const variables: PromptVariables = {
        userRequest: 'Request',
      };

      const result = builder.build('no-tone-test', scaffold, variables);

      expect(result.system).not.toContain('# Tone');
    });

    it('should format constraints as bullet list', () => {
      writeFileSync(join(tempDir, 'constraints-test.md'), 'Instructions');

      const scaffold: PromptScaffold = {
        role: 'Role',
        objective: 'Objective',
        contextSections: [],
        constraints: ['First constraint', 'Second constraint', 'Third constraint'],
        outputFormat: 'Format',
      };

      const variables: PromptVariables = {
        userRequest: 'Request',
      };

      const result = builder.build('constraints-test', scaffold, variables);

      expect(result.system).toContain('- First constraint');
      expect(result.system).toContain('- Second constraint');
      expect(result.system).toContain('- Third constraint');
    });

    it('should join context sections with newlines', () => {
      writeFileSync(join(tempDir, 'context-test.md'), 'Instructions');

      const scaffold: PromptScaffold = {
        role: 'Role',
        objective: 'Objective',
        contextSections: ['Project: Test', 'Phase: planning', 'Progress: 50%'],
        constraints: [],
        outputFormat: 'Format',
      };

      const variables: PromptVariables = {
        userRequest: 'Request',
      };

      const result = builder.build('context-test', scaffold, variables);

      expect(result.system).toContain('Project: Test\nPhase: planning\nProgress: 50%');
    });

    it('should use default instructions when file does not exist', () => {
      const scaffold: PromptScaffold = {
        role: 'Role',
        objective: 'Objective',
        contextSections: [],
        constraints: [],
        outputFormat: 'Format',
      };

      const variables: PromptVariables = {
        userRequest: 'Request',
      };

      const result = builder.build('missing-agent', scaffold, variables);

      expect(result.system).toContain('missing-agent 전문가');
      expect(result.user).toBe('Request');
    });

    it('should build prompts with real agent instructions', () => {
      const srcLoader = new PromptLoader();
      const srcBuilder = new PromptBuilder(srcLoader);

      const scaffold: PromptScaffold = {
        role: '당신은 웹소설 기획 전문가입니다',
        objective: '로그라인 3개를 생성하세요',
        contextSections: ['프로젝트: 나의 판타지', '단계: planning'],
        constraints: ['3개의 서로 다른 로그라인', 'hook 포함'],
        outputFormat: '1. ...\n2. ...\n3. ...',
        tone: '창의적이면서도 구체적으로',
      };

      const variables: PromptVariables = {
        userRequest: '현대 판타지 아이디어',
      };

      const result = srcBuilder.build('concept', scaffold, variables);

      expect(result.system).toContain('# Role');
      expect(result.system).toContain('Concept Agent');
      expect(result.system).toContain('# Objective');
      expect(result.system).toContain('# Tone');
      expect(result.system).toContain('# Agent Instructions');
      expect(result.user).toBe('현대 판타지 아이디어');
    });
  });
});
