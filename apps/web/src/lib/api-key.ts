const STORAGE_KEY = "northaApiKey:v1";

export type ApiKeySource = "local" | "env" | "none";

export function getStoredApiKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = localStorage.getItem(STORAGE_KEY)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

export function setStoredApiKey(key: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const trimmed = key.trim();
  if (!trimmed) {
    clearStoredApiKey();
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    // Ignora falhas de storage (modo privado / quota).
  }
}

export function clearStoredApiKey(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignora falhas de storage.
  }
}

function getEnvApiKey(): string | null {
  return import.meta.env.VITE_ANTHROPIC_API_KEY?.trim() || null;
}

/** Preferência: chave salva no navegador, depois variável de ambiente. */
export function getApiKey(): string | null {
  return getStoredApiKey() ?? getEnvApiKey();
}

export function getApiKeySource(): ApiKeySource {
  if (getStoredApiKey()) {
    return "local";
  }

  if (getEnvApiKey()) {
    return "env";
  }

  return "none";
}

export function isIaConfigurada(): boolean {
  return getApiKeySource() !== "none";
}

/** Headers enviados ao `/api/chat` (chave do navegador tem prioridade). */
export function getChatAuthHeaders(): Record<string, string> {
  const key = getApiKey();
  if (!key) {
    return {};
  }

  return { "x-api-key": key };
}
