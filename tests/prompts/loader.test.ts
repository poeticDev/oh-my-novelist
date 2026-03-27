import { describe, it, expect, beforeEach } from 'vitest';
import { PromptLoader } from '../../src/prompts/loader.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('PromptLoader', () => {
  let tempDir: string;
  let loader: PromptLoader;

  beforeEach(() => {
    tempDir = join(tmpdir(), `prompt-loader-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    loader = new PromptLoader(tempDir);
  });

  describe('load', () => {
    it('should load a markdown file from the prompts directory', () => {
      const testContent = '# Test Agent\n\nThis is a test prompt.';
      writeFileSync(join(tempDir, 'test-agent.md'), testContent);

      const result = loader.load('test-agent');

      expect(result).toBe(testContent);
    });

    it('should return default content for missing files', () => {
      const result = loader.load('non-existent-agent');

      expect(result).toContain('non-existent-agent');
      expect(result).toContain('전문가');
    });

    it('should cache loaded prompts', () => {
      const testContent = '# Cached Agent';
      writeFileSync(join(tempDir, 'cached-agent.md'), testContent);

      const result1 = loader.load('cached-agent');
      const result2 = loader.load('cached-agent');

      expect(result1).toBe(testContent);
      expect(result2).toBe(testContent);
      expect(result1).toBe(result2);
    });

    it('should load actual agent prompts from src/agents/prompts/', () => {
      const srcLoader = new PromptLoader();

      const conceptPrompt = srcLoader.load('concept');

      expect(conceptPrompt).toContain('Concept Agent');
      expect(conceptPrompt).toContain('# Concept Agent - System Prompt');
    });

    it('should load different agent types', () => {
      const srcLoader = new PromptLoader();

      const directorPrompt = srcLoader.load('director');
      const worldBuilderPrompt = srcLoader.load('world-builder');

      expect(directorPrompt).toContain('Director');
      expect(worldBuilderPrompt).toContain('World');
    });

    it('should load agent with hyphen in name', () => {
      const testContent = '# World Builder Agent';
      writeFileSync(join(tempDir, 'world-builder.md'), testContent);

      const result = loader.load('world-builder');

      expect(result).toBe(testContent);
    });
  });

  describe('clearCache', () => {
    it('should clear the prompt cache', () => {
      const testContent = '# Cache Test';
      writeFileSync(join(tempDir, 'cache-test.md'), testContent);

      loader.load('cache-test');
      loader.clearCache();

      const result = loader.load('cache-test');
      expect(result).toBe(testContent);
    });

    it('should allow reloading after cache clear', () => {
      const originalContent = '# Original';
      writeFileSync(join(tempDir, 'reload-test.md'), originalContent);

      loader.load('reload-test');

      const newContent = '# Updated';
      writeFileSync(join(tempDir, 'reload-test.md'), newContent);

      loader.clearCache();
      const result = loader.load('reload-test');

      expect(result).toBe(newContent);
    });
  });
});
