import { AI_PROVIDERS, type AiProvider, isAiProvider } from "./ai-provider";

export type ApiKeySource = "local" | "env" | "none";

export interface AiConfig {
  apiKey: string;
  provider: AiProvider;
  source: Exclude<ApiKeySource, "none">;
}

const LEGACY_STORAGE_KEY = "northaApiKey:v1";
const STORAGE_KEY = "northaAiConfig:v2";

function lerStorageJson(): { apiKey?: string; provider?: string } | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)?.trim();
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as { apiKey?: string; provider?: string };
  } catch {
    return null;
  }
}

function migrarChaveLegada(): { apiKey: string; provider: AiProvider } | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const legado = localStorage.getItem(LEGACY_STORAGE_KEY)?.trim();
    if (!legado) {
      return null;
    }

    const migrado = { apiKey: legado, provider: "anthropic" as const };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrado));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return migrado;
  } catch {
    return null;
  }
}

export function getStoredConfig(): {
  apiKey: string;
  provider: AiProvider;
} | null {
  const atual = lerStorageJson();
  if (atual?.apiKey?.trim() && isAiProvider(atual.provider)) {
    return { apiKey: atual.apiKey.trim(), provider: atual.provider };
  }

  return migrarChaveLegada();
}

export function getStoredApiKey(): string | null {
  const config = getStoredConfig();
  return config ? config.apiKey : null;
}

export function getStoredProvider(): AiProvider | null {
  const config = getStoredConfig();
  return config ? config.provider : null;
}

export function setStoredConfig(provider: AiProvider, apiKey: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const trimmed = apiKey.trim();
  if (!trimmed) {
    clearStoredConfig();
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ apiKey: trimmed, provider })
    );
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignora falhas de storage (modo privado / quota).
  }
}

export function clearStoredConfig(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignora falhas de storage.
  }
}

function getEnvApiKey(provider: AiProvider): string | null {
  if (provider === "anthropic") {
    return import.meta.env.VITE_ANTHROPIC_API_KEY?.trim() || null;
  }

  return (
    import.meta.env.VITE_GEMINI_API_KEY?.trim() ||
    import.meta.env.VITE_GOOGLE_API_KEY?.trim() ||
    null
  );
}

function getEnvPreferredProvider(): AiProvider | null {
  const preferred = import.meta.env.VITE_AI_PROVIDER?.trim();
  if (isAiProvider(preferred) && getEnvApiKey(preferred)) {
    return preferred;
  }

  for (const provider of AI_PROVIDERS) {
    if (getEnvApiKey(provider)) {
      return provider;
    }
  }

  return null;
}

/** Preferência: config salva no navegador, depois variáveis de ambiente. */
export function getActiveConfig(): AiConfig | null {
  const stored = getStoredConfig();
  if (stored) {
    return { ...stored, source: "local" };
  }

  const envProvider = getEnvPreferredProvider();
  if (!envProvider) {
    return null;
  }

  const apiKey = getEnvApiKey(envProvider);
  if (!apiKey) {
    return null;
  }

  return { apiKey, provider: envProvider, source: "env" };
}

export function getApiKey(): string | null {
  const config = getActiveConfig();
  return config ? config.apiKey : null;
}

export function getActiveProvider(): AiProvider | null {
  const config = getActiveConfig();
  return config ? config.provider : null;
}

export function getApiKeySource(): ApiKeySource {
  const config = getActiveConfig();
  return config ? config.source : "none";
}

export function isIaConfigurada(): boolean {
  return getApiKeySource() !== "none";
}

/** Headers enviados ao `/api/chat` (chave do navegador tem prioridade). */
export function getChatAuthHeaders(): Record<string, string> {
  const config = getActiveConfig();
  if (!config) {
    return {};
  }

  return {
    "x-ai-provider": config.provider,
    "x-api-key": config.apiKey,
  };
}
