import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLLMClient } from '../../src/llm/factory.js';
import type { AgentType } from '../../src/llm/types.js';

describe('Resilient LLM Client', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('offline mode', () => {
    it('should return degradation response without throwing when offline', async () => {
      const client = createLLMClient({ apiKey: undefined });
      
      const response = await client.generate('director', {
        system: 'You are a helpful assistant',
        user: 'Hello'
      });

      expect(response.degradation).toBe('offline');
      expect(response.modelId).toBe('offline');
      expect(response.content).toContain('[Offline Mode]');
      expect(response.error).toBe('No API key provided');
    });

    it('should not require ANTHROPIC_API_KEY for offline mode', async () => {
      const client = createLLMClient({ apiKey: undefined, cacheEnabled: false });
      
      const response = await client.generate('concept', {
        system: 'You are a concept agent',
        user: 'Generate an idea'
      });

      expect(response.degradation).toBe('offline');
      expect(response.content).toBeDefined();
      expect(response.error).toBeDefined();
    });

    it('should detect network availability', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const client = createLLMClient({ apiKey: 'test-key', maxRetries: 1 });
      
      const response = await client.generate('director', {
        system: 'You are a helpful assistant',
        user: 'Hello'
      });

      expect(response.degradation).toBe('offline');
      expect(response.error).toContain('Network error');
    });

    it('should provide helpful message in offline mode', async () => {
      const client = createLLMClient({ apiKey: undefined });
      
      const response = await client.generate('director', {
        system: 'You are a helpful assistant',
        user: 'Hello'
      });

      expect(response.content).toContain('Offline Mode');
      expect(response.content).toContain('Unable to generate response');
      expect(response.content).toContain('API key');
    });
  });

  describe('API key handling', () => {
    it('should work with valid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg_123',
          content: [{ type: 'text', text: 'Generated response' }],
          usage: { input_tokens: 10, output_tokens: 5 }
        })
      });

      const client = createLLMClient({ apiKey: 'valid-api-key' });
      
      const response = await client.generate('director', {
        system: 'You are a helpful assistant',
        user: 'Hello'
      });

      expect(response.degradation).toBe('full');
      expect(response.content).toBe('Generated response');
      expect(response.modelId).toBe('claude-3-5-sonnet-20241022');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15
      });
    });

    it('should handle missing API key gracefully', async () => {
      const client = createLLMClient({ apiKey: undefined, cacheEnabled: false });
      
      const response = await client.generate('director', {
        system: 'You are a helpful assistant',
        user: 'Hello'
      });

      expect(response.degradation).toBe('offline');
      expect(response.error).toBe('No API key provided');
      expect(response.modelId).toBe('offline');
    });

    it('should handle invalid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: 'Invalid API key', type: 'authentication_error' }
        })
      });

      const client = createLLMClient({ apiKey: 'invalid-key', maxRetries: 1 });
      
      const response = await client.generate('director', {
        system: 'You are a helpful assistant',
        user: 'Hello'
      });

      expect(response.degradation).toBe('offline');
      expect(response.error).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('caching', () => {
    it('should return cached response if available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg_123',
          content: [{ type: 'text', text: 'Cached response' }],
          usage: { input_tokens: 10, output_tokens: 5 }
        })
      });

      const client = createLLMClient({ apiKey: 'test-key' });
      const prompt = { system: 'System', user: 'User' };
      
      const response1 = await client.generate('director', prompt);
      const response2 = await client.generate('director', prompt);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(response1.content).toBe(response2.content);
      expect(response1.modelId).toBe(response2.modelId);
    });

    it('should cache successful responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg_123',
          content: [{ type: 'text', text: 'Response to cache' }],
          usage: { input_tokens: 10, output_tokens: 5 }
        })
      });

      const client = createLLMClient({ apiKey: 'test-key' });
      
      await client.generate('director', { system: 'System', user: 'User' });
      
      const response2 = await client.generate('director', { system: 'System', user: 'User' });

      expect(response2.content).toBe('Response to cache');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect cache TTL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'msg_123',
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 10, output_tokens: 5 }
        })
      });

      const client = createLLMClient({ 
        apiKey: 'test-key', 
        cacheTTL: 1000 
      });
      const prompt = { system: 'System', user: 'User' };
      
      await client.generate('director', prompt);
      
      vi.advanceTimersByTime(500);
      await client.generate('director', prompt);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      vi.advanceTimersByTime(600);
      await client.generate('director', prompt);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('retry logic', () => {
    it('should retry on transient failures', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'msg_123',
            content: [{ type: 'text', text: 'Success after retries' }],
            usage: { input_tokens: 10, output_tokens: 5 }
          })
        });

      const client = createLLMClient({ apiKey: 'test-key', maxRetries: 3 });
      
      const responsePromise = client.generate('director', {
        system: 'System',
        user: 'User'
      });

      await vi.runAllTimersAsync();
      const response = await responsePromise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(response.content).toBe('Success after retries');
      expect(response.degradation).toBe('full');
    }, 10000);

    it('should fail after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = createLLMClient({ apiKey: 'test-key', maxRetries: 2 });
      
      const responsePromise = client.generate('director', {
        system: 'System',
        user: 'User'
      });

      await vi.runAllTimersAsync();
      const response = await responsePromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response.degradation).toBe('offline');
      expect(response.error).toContain('Network error');
    }, 10000);

    it('should not retry on non-retryable errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: 'Invalid API key', type: 'authentication_error' }
        })
      });

      const client = createLLMClient({ apiKey: 'test-key', maxRetries: 3 });
      
      const responsePromise = client.generate('director', {
        system: 'System',
        user: 'User'
      });

      await vi.runAllTimersAsync();
      const response = await responsePromise;

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(response.degradation).toBe('offline');
    });
  });
});
