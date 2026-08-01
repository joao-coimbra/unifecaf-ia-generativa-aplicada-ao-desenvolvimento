export type AiProvider = "anthropic" | "gemini";

export const AI_PROVIDERS = ["anthropic", "gemini"] as const;

export function isAiProvider(value: unknown): value is AiProvider {
  return value === "anthropic" || value === "gemini";
}

export function rotuloProvedor(provider: AiProvider): string {
  return provider === "anthropic" ? "Claude (Anthropic)" : "Gemini (Google)";
}

export function placeholderChave(provider: AiProvider): string {
  return provider === "anthropic" ? "sk-ant-..." : "AIza...";
}

export function urlConsoleProvedor(provider: AiProvider): string {
  return provider === "anthropic"
    ? "https://console.anthropic.com/"
    : "https://aistudio.google.com/apikey";
}

export function rotuloConsoleProvedor(provider: AiProvider): string {
  return provider === "anthropic"
    ? "console.anthropic.com"
    : "aistudio.google.com/apikey";
}
