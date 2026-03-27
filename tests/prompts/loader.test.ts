/**
 * Tests for PromptLoader
 * 
 * These tests define the expected behavior for:
 * - Loading markdown prompt files from src/agents/prompts/
 * - Parsing YAML frontmatter metadata
 * - Extracting template variables
 */

import { describe, it, expect } from 'vitest';

// These imports will fail until Task 3 implements the loader
// import { PromptLoader } from '../../src/prompts/loader.js';

describe('PromptLoader', () => {
  describe('loadPrompt', () => {
    it('should load a markdown file from src/agents/prompts/', async () => {
      // TODO: Implement PromptLoader in src/prompts/loader.ts
      // Expected: Loads director.md and returns content
      expect(true).toBe(false); // Failing until implemented
    });

    it('should parse YAML frontmatter metadata', async () => {
      // Expected: Frontmatter like --- agent: director --- should be parsed
      expect(true).toBe(false); // Failing until implemented
    });

    it('should extract template variables from {{variable}} syntax', async () => {
      // Expected: Variables like {{projectName}} should be extracted
      expect(true).toBe(false); // Failing until implemented
    });

    it('should throw error for non-existent prompt file', async () => {
      // Expected: Should throw FileNotFoundError for missing files
      expect(true).toBe(false); // Failing until implemented
    });

    it('should cache loaded prompts', async () => {
      // Expected: Same prompt loaded twice should use cache
      expect(true).toBe(false); // Failing until implemented
    });
  });

  describe('listAvailablePrompts', () => {
    it('should return list of available prompt files', async () => {
      // Expected: Returns array of prompt names (director, concept, world-builder, etc.)
      expect(true).toBe(false); // Failing until implemented
    });

    it('should filter prompts by agent type', async () => {
      // Expected: Should support filtering by agent type
      expect(true).toBe(false); // Failing until implemented
    });
  });
});
