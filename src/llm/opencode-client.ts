import type { LLMResponse } from "./types.js";

export interface OpenCodeClientLike {
  session?: {
    create: (args: { body: { title: string } }) => Promise<unknown>;
    prompt: (args: {
      path: { id: string };
      body: {
        noReply?: boolean;
        model?: { providerID: string; modelID: string };
        parts: Array<{ type: "text"; text: string }>;
      };
    }) => Promise<unknown>;
  };
}

export async function executeWithOpenCode(
  client: OpenCodeClientLike,
  modelId: string,
  prompt: { system: string; user: string }
): Promise<LLMResponse> {
  const sessionApi = client.session;

  if (!sessionApi) {
    throw new Error("OpenCode client session API is unavailable");
  }

  const sessionResult = await sessionApi.create({
    body: { title: `oh-my-novelist:${modelId}` }
  });
  const session = getData(sessionResult) as { id?: string };

  if (!session.id) {
    throw new Error("OpenCode session creation did not return an id");
  }

  await sessionApi.prompt({
    path: { id: session.id },
    body: {
      noReply: true,
      parts: [{ type: "text", text: prompt.system }]
    }
  });

  const [providerID, modelID] = splitModelId(modelId);

  const response = await sessionApi.prompt({
    path: { id: session.id },
    body: {
      model: { providerID, modelID },
      parts: [{ type: "text", text: prompt.user }]
    }
  });

  const payload = getData(response) as {
    parts?: Array<{ type?: string; text?: string }>;
    info?: { modelID?: string; usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } };
  };

  const content = (payload.parts ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");

  return {
    content,
    modelId,
    degradation: "full",
    usage: payload.info?.usage
      ? {
          promptTokens: payload.info.usage.inputTokens ?? 0,
          completionTokens: payload.info.usage.outputTokens ?? 0,
          totalTokens:
            payload.info.usage.totalTokens ??
            (payload.info.usage.inputTokens ?? 0) +
              (payload.info.usage.outputTokens ?? 0)
        }
      : undefined
  };
}

function splitModelId(modelId: string): [string, string] {
  const [providerID, ...rest] = modelId.split("/");
  return [providerID, rest.join("/")];
}

function getData(value: unknown): unknown {
  if (value && typeof value === "object" && "data" in value) {
    return (value as { data: unknown }).data;
  }

  return value;
}
