declare module "@opencode-ai/plugin" {
  export interface PluginInput {
    client: unknown;
    project: string | null;
    directory: string;
    $: unknown;
  }

  interface Message {
    id: string;
    sessionID: string;
  }

  interface PartOutput {
    id: string;
    sessionID: string;
    messageID: string;
    type: string;
    text: string;
  }

  interface MessageOutput {
    message: Message;
    parts: PartOutput[];
  }

  export interface Hooks {
    tool?: Record<string, unknown>;
    "chat.message"?: (input: unknown, output: MessageOutput) => Promise<void>;
    "chat.params"?: (input: unknown, output: unknown) => Promise<void>;
    "tool.execute.before"?: (input: unknown, output: unknown) => Promise<void>;
    "tool.execute.after"?: (input: unknown, output: unknown) => Promise<void>;
    event?: (input: { event: { type: string } }) => Promise<void>;
    config?: (config: unknown) => Promise<void>;
  }

  export type Plugin = (input: PluginInput) => Promise<Hooks>;
}

declare module "@opencode-ai/sdk" {
  export interface Part {
    id: string;
    sessionID: string;
    messageID: string;
    type: string;
    text: string;
  }

  export interface TextPart extends Part {
    type: "text";
  }
}
