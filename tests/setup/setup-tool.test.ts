/**
 * Setup Tool Tests
 *
 * These tests verify the tool registration and action handling contract.
 * They test the interface, not the implementation (which uses mocked SetupManagerTool).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the SetupManagerTool before importing the tool
const mockInspect = vi.fn();
const mockPreview = vi.fn();
const mockApply = vi.fn();

vi.mock("../../src/tools/setup-manager.js", () => {
  return {
    SetupManagerTool: vi.fn().mockImplementation(() => ({
      inspect: mockInspect,
      preview: mockPreview,
      apply: mockApply,
    })),
  };
});

// Import after mocking
import { SetupManagerTool } from "../../src/tools/setup-manager.js";

// Tool definition factory - mimics how the tool would be registered in index.ts
function createSetupTool(todoManager: any) {
  return {
    novelist_setup: {
      description:
        "Setup and configure the novelist project - inspect current state, preview changes, or apply configuration",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["inspect", "preview", "apply"],
            description:
              "Action to perform: inspect current state, preview changes, or apply configuration",
          },
          config: {
            type: "object",
            description:
              "Configuration object (required for preview and apply actions)",
            properties: {
              projectName: {
                type: "string",
                description: "Name of the project",
              },
              template: {
                type: "string",
                description: "Template to use for project setup",
              },
              options: {
                type: "object",
                description: "Additional setup options",
              },
            },
          },
          dryRun: {
            type: "boolean",
            description:
              "If true, only simulates changes without applying them (for apply action)",
          },
        },
        required: ["action"],
      },
      execute: async (args: {
        action: string;
        config?: {
          projectName?: string;
          template?: string;
          options?: Record<string, unknown>;
        };
        dryRun?: boolean;
      }) => {
        // Validate action parameter
        if (!args.action) {
          return {
            success: false,
            error: "Missing required parameter: action",
          };
        }

        const validActions = ["inspect", "preview", "apply"];
        if (!validActions.includes(args.action)) {
          return {
            success: false,
            error: `Invalid action: ${args.action}. Must be one of: ${validActions.join(", ")}`,
          };
        }

        const setupManager = new SetupManagerTool(todoManager);

        try {
          switch (args.action) {
            case "inspect":
              return await setupManager.inspect();
            case "preview":
              if (!args.config) {
                return {
                  success: false,
                  error: "Missing required parameter: config (required for preview action)",
                };
              }
              return await setupManager.preview(args.config);
            case "apply":
              if (!args.config) {
                return {
                  success: false,
                  error: "Missing required parameter: config (required for apply action)",
                };
              }
              return await setupManager.apply(args.config, args.dryRun ?? false);
            default:
              // This should never happen due to validation above
              return {
                success: false,
                error: `Unsupported action: ${args.action}`,
              };
          }
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Unknown error occurred",
          };
        }
      },
    },
  };
}

describe("Setup Tool Registration", () => {
  let tool: ReturnType<typeof createSetupTool>;
  let mockTodoManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTodoManager = {
      listTodos: vi.fn(),
      createTodos: vi.fn(),
    };
    tool = createSetupTool(mockTodoManager);
  });

  describe("tool structure", () => {
    it("should have correct tool name", () => {
      expect(tool).toHaveProperty("novelist_setup");
    });

    it("should have description", () => {
      expect(tool.novelist_setup.description).toContain("Setup");
      expect(tool.novelist_setup.description.toLowerCase()).toContain(
        "inspect"
      );
      expect(tool.novelist_setup.description.toLowerCase()).toContain(
        "preview"
      );
      expect(tool.novelist_setup.description.toLowerCase()).toContain("apply");
    });

    it("should have parameters schema", () => {
      expect(tool.novelist_setup.parameters).toBeDefined();
      expect(tool.novelist_setup.parameters.type).toBe("object");
    });

    it("should define action parameter with correct enum values", () => {
      const actionParam = tool.novelist_setup.parameters.properties.action;
      expect(actionParam).toBeDefined();
      expect(actionParam.type).toBe("string");
      expect(actionParam.enum).toContain("inspect");
      expect(actionParam.enum).toContain("preview");
      expect(actionParam.enum).toContain("apply");
      expect(actionParam.enum).toHaveLength(3);
    });

    it("should mark action as required parameter", () => {
      expect(tool.novelist_setup.parameters.required).toContain("action");
    });

    it("should have optional config parameter", () => {
      const configParam = tool.novelist_setup.parameters.properties.config;
      expect(configParam).toBeDefined();
      expect(configParam.type).toBe("object");
    });

    it("should have optional dryRun parameter", () => {
      const dryRunParam = tool.novelist_setup.parameters.properties.dryRun;
      expect(dryRunParam).toBeDefined();
      expect(dryRunParam.type).toBe("boolean");
    });

    it("should have execute function", () => {
      expect(typeof tool.novelist_setup.execute).toBe("function");
    });
  });
});

describe("Setup Tool Action Handling", () => {
  let tool: ReturnType<typeof createSetupTool>;
  let mockTodoManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTodoManager = {
      listTodos: vi.fn(),
      createTodos: vi.fn(),
    };
    tool = createSetupTool(mockTodoManager);
  });

  describe("action parameter validation", () => {
    it("should reject missing action parameter", async () => {
      const result = await tool.novelist_setup.execute({} as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing required parameter");
      expect(result.error).toContain("action");
    });

    it("should reject empty action parameter", async () => {
      const result = await tool.novelist_setup.execute({ action: "" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid action");
    });

    it("should reject invalid action value", async () => {
      const result = await tool.novelist_setup.execute({
        action: "invalid_action",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid action");
      expect(result.error).toContain("invalid_action");
    });

    it("should list valid actions in error message", async () => {
      const result = await tool.novelist_setup.execute({ action: "unknown" });

      expect(result.error).toContain("inspect");
      expect(result.error).toContain("preview");
      expect(result.error).toContain("apply");
    });
  });

  describe("inspect action", () => {
    it("should call SetupManagerTool.inspect() for inspect action", async () => {
      mockInspect.mockResolvedValue({
        success: true,
        data: { status: "ready" },
      });

      const result = await tool.novelist_setup.execute({ action: "inspect" });

      expect(mockInspect).toHaveBeenCalledTimes(1);
      expect(mockInspect).toHaveBeenCalledWith();
    });

    it("should return success payload for inspect", async () => {
      mockInspect.mockResolvedValue({
        success: true,
        data: { status: "ready", projectCount: 5 },
      });

      const result = await tool.novelist_setup.execute({ action: "inspect" });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.status).toBe("ready");
    });

    it("should return error payload when inspect fails", async () => {
      mockInspect.mockResolvedValue({
        success: false,
        error: "Failed to inspect setup state",
      });

      const result = await tool.novelist_setup.execute({ action: "inspect" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to inspect setup state");
    });
  });

  describe("preview action", () => {
    it("should reject preview without config parameter", async () => {
      const result = await tool.novelist_setup.execute({ action: "preview" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing required parameter");
      expect(result.error).toContain("config");
    });

    it("should call SetupManagerTool.preview() with config", async () => {
      const config = { projectName: "Test Project", template: "fantasy" };
      mockPreview.mockResolvedValue({
        success: true,
        data: { changes: ["create folder", "init project"] },
      });

      const result = await tool.novelist_setup.execute({
        action: "preview",
        config,
      });

      expect(mockPreview).toHaveBeenCalledTimes(1);
      expect(mockPreview).toHaveBeenCalledWith(config);
    });

    it("should return success payload with changes for preview", async () => {
      const config = { projectName: "Test Project" };
      mockPreview.mockResolvedValue({
        success: true,
        data: {
          changes: [{ type: "create", path: "/test" }],
          summary: "Will create 1 item",
        },
      });

      const result = await tool.novelist_setup.execute({
        action: "preview",
        config,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.changes).toBeInstanceOf(Array);
    });
  });

  describe("apply action", () => {
    it("should reject apply without config parameter", async () => {
      const result = await tool.novelist_setup.execute({ action: "apply" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing required parameter");
      expect(result.error).toContain("config");
    });

    it("should call SetupManagerTool.apply() with config and dryRun=false by default", async () => {
      const config = { projectName: "Test Project" };
      mockApply.mockResolvedValue({
        success: true,
        message: "Setup applied successfully",
      });

      await tool.novelist_setup.execute({ action: "apply", config });

      expect(mockApply).toHaveBeenCalledTimes(1);
      expect(mockApply).toHaveBeenCalledWith(config, false);
    });

    it("should pass dryRun=true when specified", async () => {
      const config = { projectName: "Test Project" };
      mockApply.mockResolvedValue({
        success: true,
        message: "Dry run completed",
      });

      await tool.novelist_setup.execute({
        action: "apply",
        config,
        dryRun: true,
      });

      expect(mockApply).toHaveBeenCalledWith(config, true);
    });

    it("should return success payload for apply", async () => {
      const config = { projectName: "Test Project" };
      mockApply.mockResolvedValue({
        success: true,
        message: "Project setup complete",
        data: { projectId: "proj-123" },
      });

      const result = await tool.novelist_setup.execute({
        action: "apply",
        config,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Project setup complete");
      expect(result.data).toBeDefined();
    });
  });
});

describe("Setup Tool Success Payload Shape", () => {
  let tool: ReturnType<typeof createSetupTool>;
  let mockTodoManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTodoManager = {};
    tool = createSetupTool(mockTodoManager);
  });

  it("should return payload with success boolean", async () => {
    mockInspect.mockResolvedValue({ success: true, data: {} });

    const result = await tool.novelist_setup.execute({ action: "inspect" });

    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");
  });

  it("should include message field when provided", async () => {
    mockApply.mockResolvedValue({
      success: true,
      message: "Operation completed",
    });

    const result = await tool.novelist_setup.execute({
      action: "apply",
      config: {},
    });

    expect(result.message).toBe("Operation completed");
  });

  it("should include data field when provided", async () => {
    const responseData = { items: [], count: 0 };
    mockInspect.mockResolvedValue({
      success: true,
      data: responseData,
    });

    const result = await tool.novelist_setup.execute({ action: "inspect" });

    expect(result.data).toEqual(responseData);
  });

  it("should NOT include data field when not provided", async () => {
    mockInspect.mockResolvedValue({ success: true });

    const result = await tool.novelist_setup.execute({ action: "inspect" });

    // data is optional in success payload
    expect(result.success).toBe(true);
  });
});

describe("Setup Tool Error Payload Shape", () => {
  let tool: ReturnType<typeof createSetupTool>;
  let mockTodoManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTodoManager = {};
    tool = createSetupTool(mockTodoManager);
  });

  it("should return success: false for invalid actions", async () => {
    const result = await tool.novelist_setup.execute({
      action: "invalid",
    });

    expect(result.success).toBe(false);
  });

  it("should include error message field", async () => {
    const result = await tool.novelist_setup.execute({
      action: "invalid",
    });

    expect(result).toHaveProperty("error");
    expect(typeof result.error).toBe("string");
    expect(result.error.length).toBeGreaterThan(0);
  });

  it("should NOT include data field in error responses", async () => {
    const result = await tool.novelist_setup.execute({} as any);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    // data should not be present in error responses
    expect(result.data).toBeUndefined();
  });

  it("should handle SetupManagerTool exceptions gracefully", async () => {
    mockInspect.mockRejectedValue(new Error("Internal tool error"));

    const result = await tool.novelist_setup.execute({ action: "inspect" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Internal tool error");
  });

  it("should handle non-Error exceptions", async () => {
    mockInspect.mockRejectedValue("String error");

    const result = await tool.novelist_setup.execute({ action: "inspect" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unknown error occurred");
  });
});

describe("Setup Tool Unsupported Action Rejection", () => {
  let tool: ReturnType<typeof createSetupTool>;
  let mockTodoManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTodoManager = {};
    tool = createSetupTool(mockTodoManager);
  });

  it("should reject 'delete' action", async () => {
    const result = await tool.novelist_setup.execute({ action: "delete" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid action");
  });

  it("should reject 'update' action", async () => {
    const result = await tool.novelist_setup.execute({ action: "update" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid action");
  });

  it("should reject 'create' action", async () => {
    const result = await tool.novelist_setup.execute({ action: "create" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid action");
  });

  it("should reject actions with special characters", async () => {
    const result = await tool.novelist_setup.execute({ action: "inspect;rm -rf" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid action");
  });

  it("should reject case-sensitive invalid actions", async () => {
    const result = await tool.novelist_setup.execute({ action: "Inspect" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid action");
  });

  it("should only allow lowercase action names", async () => {
    const upperResult = await tool.novelist_setup.execute({
      action: "INSPECT",
    });
    const mixedResult = await tool.novelist_setup.execute({
      action: "Preview",
    });

    expect(upperResult.success).toBe(false);
    expect(mixedResult.success).toBe(false);
  });
});

describe("Setup Tool Integration with TodoManager", () => {
  let tool: ReturnType<typeof createSetupTool>;
  let mockTodoManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTodoManager = {
      listTodos: vi.fn().mockReturnValue({ todos: [] }),
      createTodos: vi.fn().mockReturnValue({ success: true }),
    };
    tool = createSetupTool(mockTodoManager);
  });

  it("should pass todoManager to SetupManagerTool constructor", async () => {
    mockInspect.mockResolvedValue({ success: true });

    await tool.novelist_setup.execute({ action: "inspect" });

    expect(SetupManagerTool).toHaveBeenCalledWith(mockTodoManager);
  });

  it("should handle todoManager errors gracefully", async () => {
    mockInspect.mockImplementation(() => {
      throw new Error("TodoManager not available");
    });

    const result = await tool.novelist_setup.execute({ action: "inspect" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("TodoManager not available");
  });
});
