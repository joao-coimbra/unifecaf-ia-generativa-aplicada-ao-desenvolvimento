const RETRY_SECONDS_REGEX = /retry in ([\d.]+)\s*s/i;
const MODEL_REGEX = /model:\s*([a-z0-9.-]+)/i;

function extrairTextoAninhado(valor: unknown, profundidade = 0): string {
  if (profundidade > 4 || valor === null || valor === undefined) {
    return "";
  }

  if (typeof valor === "string") {
    const trimmed = valor.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return extrairTextoAninhado(JSON.parse(trimmed), profundidade + 1);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (typeof valor !== "object") {
    return String(valor);
  }

  const obj = valor as Record<string, unknown>;
  if (obj.error !== undefined && obj.error !== null) {
    return extrairTextoAninhado(obj.error, profundidade + 1);
  }
  if (typeof obj.message === "string") {
    return extrairTextoAninhado(obj.message, profundidade + 1);
  }

  return JSON.stringify(valor);
}

function segundosRetry(texto: string): number | null {
  const match = texto.match(RETRY_SECONDS_REGEX);
  if (!match?.[1]) {
    return null;
  }
  const segundos = Math.ceil(Number(match[1]));
  return Number.isFinite(segundos) && segundos > 0 ? segundos : null;
}

function eErroDeCota(texto: string): boolean {
  const lower = texto.toLowerCase();
  return (
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes('"code":429') ||
    lower.includes('"code": 429') ||
    lower.includes("exceeded your current quota")
  );
}

/** Normaliza erros brutos da API (JSON aninhado / 429) para mensagem amigável. */
export function formatarErroIa(error: unknown): string {
  let raw = "Falha ao processar a conversa com a IA.";
  if (error instanceof Error) {
    raw = error.message;
  } else if (typeof error === "string") {
    raw = error;
  }

  const texto = extrairTextoAninhado(raw) || raw;

  if (!eErroDeCota(texto)) {
    // Evita jogar JSON cru na UI quando houver message legível.
    if (texto.startsWith("{") && texto.includes('"message"')) {
      const aninhado = extrairTextoAninhado(texto);
      if (aninhado && aninhado !== texto && !aninhado.startsWith("{")) {
        return aninhado;
      }
    }
    return texto.length > 280 ? `${texto.slice(0, 277)}…` : texto;
  }

  const retry = segundosRetry(texto);
  const modeloMatch = texto.match(MODEL_REGEX);
  const modelo = modeloMatch?.[1];

  const partes = [
    "Limite da API Gemini atingido (cota gratuita / rate limit).",
  ];

  if (retry === null) {
    partes.push("Aguarde um pouco ou use outra chave.");
  } else {
    partes.push(`Tente de novo em cerca de ${retry}s.`);
  }

  if (modelo) {
    partes.push(`Modelo afetado: ${modelo}.`);
  }

  partes.push("O app usa gemini-2.5-flash-lite para reduzir o consumo.");

  return partes.join(" ");
}
