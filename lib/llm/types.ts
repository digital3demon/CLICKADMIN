export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionOptions = {
  messages: ChatMessage[];
  responseFormat?: "json_object";
  temperature?: number;
};

export type ChatCompletionResult = {
  ok: true;
  content: string;
  model: string;
  durationMs: number;
} | {
  ok: false;
  error: string;
  durationMs: number;
};
