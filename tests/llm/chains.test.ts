/**
 * Tests for LLM chain utilities
 * 
 * These tests define the expected behavior for:
 * - resolveGenerationConfig: Returns correct category params and legacy compatibility defaults separately
 */

import { describe, it, expect } from 'vitest';
import {
  resolveGenerationConfig,
  CATEGORY_PARAMS,
  AGENT_CATEGORIES,
  LEGACY_DEFAULT_MODEL_ID
} from '../../src/llm/chains.js';
import type { AgentType, ModelCategory } from '../../src/llm/types.js';

describe('LLM Chains', () => {
  describe('resolveGenerationConfig', () => {
    it('should return category params separately from the legacy default model id', () => {
      const config = resolveGenerationConfig('concept');
      
      // Verify structure: params and defaultModelId are separate properties
      expect(config).toHaveProperty('category');
      expect(config).toHaveProperty('params');
      expect(config).toHaveProperty('defaultModelId');
      
      // Verify params is GenerationParams structure
      expect(config.params).toHaveProperty('temperature');
      expect(config.params).toHaveProperty('maxTokens');
      expect(config.params).toHaveProperty('topP');
      
      expect(config.defaultModelId).toBe('anthropic/claude-3-5-sonnet-20241022');
    });

    it('should return correct category params for each agent type', () => {
      const agentCategories: Record<AgentType, ModelCategory> = {
        director: 'planning',
        concept: 'planning',
        worldBuilder: 'planning',
        character: 'planning',
        plot: 'planning',
        scene: 'drafting',
        dialogue: 'drafting',
        critic: 'critique',
        editor: 'editing'
      };
      
      // Test each agent type
      (Object.keys(agentCategories) as AgentType[]).forEach(agentType => {
        const config = resolveGenerationConfig(agentType);
        const expectedCategory = agentCategories[agentType];
        
        expect(config.category).toBe(expectedCategory);
        expect(config.params).toEqual(CATEGORY_PARAMS[expectedCategory]);
      });
    });

    it('should return correct category params for planning agents', () => {
      const conceptConfig = resolveGenerationConfig('concept');
      
      expect(conceptConfig.category).toBe('planning');
      expect(conceptConfig.params.temperature).toBe(0.8);
      expect(conceptConfig.params.maxTokens).toBe(4096);
      expect(conceptConfig.params.topP).toBe(0.9);
    });

    it('should return correct category params for drafting agents', () => {
      const sceneConfig = resolveGenerationConfig('scene');
      const dialogueConfig = resolveGenerationConfig('dialogue');
      
      expect(sceneConfig.category).toBe('drafting');
      expect(dialogueConfig.category).toBe('drafting');
      
      expect(sceneConfig.params.temperature).toBe(0.7);
      expect(sceneConfig.params.maxTokens).toBe(4096);
      expect(sceneConfig.params.topP).toBe(0.9);
    });

    it('should return correct category params for critique agent', () => {
      const criticConfig = resolveGenerationConfig('critic');
      
      expect(criticConfig.category).toBe('critique');
      expect(criticConfig.params.temperature).toBe(0.3);
      expect(criticConfig.params.maxTokens).toBe(3072);
      expect(criticConfig.params.topP).toBe(0.5);
    });

    it('should return correct category params for editing agent', () => {
      const editorConfig = resolveGenerationConfig('editor');
      
      expect(editorConfig.category).toBe('editing');
      expect(editorConfig.params.temperature).toBe(0.2);
      expect(editorConfig.params.maxTokens).toBe(3072);
      expect(editorConfig.params.topP).toBe(0.3);
    });

    it('should return the legacy Anthropic compatibility default model id', () => {
      const config = resolveGenerationConfig('concept');
      
      expect(config.defaultModelId).toBe('anthropic/claude-3-5-sonnet-20241022');
    });

    it('should handle missing optional parameters gracefully', () => {
      // Function should work with just agentType, no optional parameters needed
      expect(() => resolveGenerationConfig('director')).not.toThrow();
      expect(() => resolveGenerationConfig('scene')).not.toThrow();
      expect(() => resolveGenerationConfig('critic')).not.toThrow();
    });

    it('should validate agent type is supported', () => {
      // Invalid agent type should throw
      expect(() => resolveGenerationConfig('invalid' as AgentType)).toThrow('Unsupported agent type');
      expect(() => resolveGenerationConfig('' as AgentType)).toThrow('Unsupported agent type');
    });

    it('should export AGENT_CATEGORIES mapping', () => {
      expect(AGENT_CATEGORIES.director).toBe('planning');
      expect(AGENT_CATEGORIES.concept).toBe('planning');
      expect(AGENT_CATEGORIES.scene).toBe('drafting');
      expect(AGENT_CATEGORIES.critic).toBe('critique');
      expect(AGENT_CATEGORIES.editor).toBe('editing');
    });

    it('should export CATEGORY_PARAMS mapping', () => {
      expect(CATEGORY_PARAMS.planning).toEqual({
        temperature: 0.8,
        maxTokens: 4096,
        topP: 0.9
      });
      expect(CATEGORY_PARAMS.drafting).toEqual({
        temperature: 0.7,
        maxTokens: 4096,
        topP: 0.9
      });
      expect(CATEGORY_PARAMS.critique).toEqual({
        temperature: 0.3,
        maxTokens: 3072,
        topP: 0.5
      });
      expect(CATEGORY_PARAMS.editing).toEqual({
        temperature: 0.2,
        maxTokens: 3072,
        topP: 0.3
      });
    });

    it('should export the legacy compatibility default model id', () => {
      expect(LEGACY_DEFAULT_MODEL_ID).toBe('anthropic/claude-3-5-sonnet-20241022');
    });
  });
});
