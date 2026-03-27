/**
 * Tests for ContextManager
 *
 * These tests define the expected behavior for:
 * - Isolating projects from each other
 * - Managing project-specific context
 * - Context cleanup on project switch
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { ContextManager } from "../../src/context/manager.js";
import type { ConversationEntry } from "../../src/llm/types.js";

describe("ContextManager", () => {
  let tempDir: string;
  let manager: ContextManager;

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = mkdtempSync(join(tmpdir(), "context-test-"));
    manager = new ContextManager({ baseDir: tempDir, maxConversationTurns: 3 });
  });

  afterEach(() => {
    // Clean up temp directory
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("project isolation", () => {
    it("should isolate context between different projects", () => {
      // Add conversation to Project A
      const entryA: ConversationEntry = {
        role: "user",
        content: "Hello Project A",
        timestamp: new Date().toISOString(),
      };
      manager.recordTurn("project-a", entryA);

      // Add conversation to Project B
      const entryB: ConversationEntry = {
        role: "assistant",
        content: "Hello Project B",
        timestamp: new Date().toISOString(),
      };
      manager.recordTurn("project-b", entryB);

      // Build context for each project
      const contextA = manager.build("director", "project-a");
      const contextB = manager.build("director", "project-b");

      // Verify isolation - Project A should only have its own conversation
      expect(contextA.recentConversation).toHaveLength(1);
      expect(contextA.recentConversation[0].content).toBe("Hello Project A");

      // Project B should only have its own conversation
      expect(contextB.recentConversation).toHaveLength(1);
      expect(contextB.recentConversation[0].content).toBe("Hello Project B");
    });

    it("should switch context when project changes", () => {
      // Add multiple entries to different projects
      manager.recordTurn("project-a", {
        role: "user",
        content: "Message A1",
        timestamp: new Date().toISOString(),
      });
      manager.recordTurn("project-b", {
        role: "user",
        content: "Message B1",
        timestamp: new Date().toISOString(),
      });

      // Build context for project-a
      const contextA = manager.build("director", "project-a");
      expect(contextA.recentConversation).toHaveLength(1);
      expect(contextA.recentConversation[0].content).toBe("Message A1");

      // Build context for project-b
      const contextB = manager.build("director", "project-b");
      expect(contextB.recentConversation).toHaveLength(1);
      expect(contextB.recentConversation[0].content).toBe("Message B1");
    });

    it("should preserve context when switching back to previous project", () => {
      // Add entries to project-a
      manager.recordTurn("project-a", {
        role: "user",
        content: "Original A",
        timestamp: new Date().toISOString(),
      });

      // Switch to project-b
      manager.recordTurn("project-b", {
        role: "user",
        content: "Message B",
        timestamp: new Date().toISOString(),
      });

      // Switch back to project-a - context should be preserved
      const contextA = manager.build("director", "project-a");
      expect(contextA.recentConversation).toHaveLength(1);
      expect(contextA.recentConversation[0].content).toBe("Original A");
    });
  });

  describe("context operations", () => {
    it("should add items to current project context", () => {
      const entry: ConversationEntry = {
        role: "user",
        content: "Test message",
        timestamp: new Date().toISOString(),
      };

      manager.recordTurn("test-project", entry);

      const context = manager.build("director", "test-project");
      expect(context.recentConversation).toHaveLength(1);
      expect(context.recentConversation[0].content).toBe("Test message");
    });

    it("should retrieve items from current project context", () => {
      // Add multiple entries
      manager.recordTurn("test-project", {
        role: "user",
        content: "First message",
        timestamp: new Date().toISOString(),
      });
      manager.recordTurn("test-project", {
        role: "assistant",
        content: "Second message",
        timestamp: new Date().toISOString(),
      });

      const context = manager.build("director", "test-project");
      expect(context.recentConversation).toHaveLength(2);
      expect(context.recentConversation[0].content).toBe("First message");
      expect(context.recentConversation[1].content).toBe("Second message");
    });

    it("should clear context for a project", () => {
      // Add entries
      manager.recordTurn("test-project", {
        role: "user",
        content: "Message",
        timestamp: new Date().toISOString(),
      });

      // Clear the project
      manager.clearProject("test-project");

      // Verify context is cleared
      const context = manager.build("director", "test-project");
      expect(context.recentConversation).toHaveLength(0);
    });

    it("should return empty context for non-existent project", () => {
      const context = manager.build("director", "non-existent-project");
      expect(context.recentConversation).toHaveLength(0);
      expect(context.canon?.project).toBeNull();
      expect(context.canon?.todoSummary).toBeNull();
    });
  });

  describe("context limits", () => {
    it("should enforce conversation turn limit per project", () => {
      // Add more entries than the limit (maxConversationTurns = 3)
      for (let i = 0; i < 5; i++) {
        manager.recordTurn("test-project", {
          role: i % 2 === 0 ? "user" : "assistant",
          content: `Message ${i + 1}`,
          timestamp: new Date().toISOString(),
        });
      }

      const context = manager.build("director", "test-project");
      // Should only have the last 3 entries
      expect(context.recentConversation).toHaveLength(3);
      expect(context.recentConversation[0].content).toBe("Message 3");
      expect(context.recentConversation[2].content).toBe("Message 5");
    });

    it("should evict old items when limit exceeded", () => {
      // Add entries up to limit
      manager.recordTurn("test-project", {
        role: "user",
        content: "Old message",
        timestamp: new Date().toISOString(),
      });
      manager.recordTurn("test-project", {
        role: "assistant",
        content: "Middle message",
        timestamp: new Date().toISOString(),
      });
      manager.recordTurn("test-project", {
        role: "user",
        content: "New message",
        timestamp: new Date().toISOString(),
      });

      // Add one more - should evict the oldest
      manager.recordTurn("test-project", {
        role: "assistant",
        content: "Latest message",
        timestamp: new Date().toISOString(),
      });

      const context = manager.build("director", "test-project");
      expect(context.recentConversation).toHaveLength(3);
      // Oldest message should be evicted
      expect(
        context.recentConversation.some((e) => e.content === "Old message")
      ).toBe(false);
      expect(
        context.recentConversation.some((e) => e.content === "Latest message")
      ).toBe(true);
    });

    it("should provide context size information", () => {
      // Add entries
      manager.recordTurn("test-project", {
        role: "user",
        content: "Hello world",
        timestamp: new Date().toISOString(),
      });

      const info = manager.getContextInfo("test-project");
      expect(info.conversationCount).toBe(1);
      // Rough token estimation: "Hello world" is 11 chars, ~3 tokens
      expect(info.estimatedTokens).toBeGreaterThan(0);
    });
  });
});
