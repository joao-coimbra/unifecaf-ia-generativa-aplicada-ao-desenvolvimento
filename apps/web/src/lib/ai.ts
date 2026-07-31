import { getApiKey } from "./api-key";
import type { Documento } from "./knowledge-base";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-5";
const ANTHROPIC_VERSION = "2023-06-01";

interface AnthropicTextBlock {
  text?: string;
  type: string;
}

interface AnthropicResponse {
  content: AnthropicTextBlock[];
}

function montarContexto(docs: Documento[]): string {
  return docs
    .map(
      (doc) =>
        `[${doc.codigo}] ${doc.titulo} (${doc.categoria})\n${doc.conteudo}`
    )
    .join("\n\n---\n\n");
}

function respostaOffline(docs: Documento[]): string {
  const [principal] = docs;

  if (!principal) {
    return "Não encontrei documentos relevantes na base de conhecimento da Northa para essa pergunta. Sugiro contatar o RH ou a TI diretamente.";
  }

  return [
    "**Modo offline** — respondendo com base no documento mais relevante.",
    "",
    `**Fonte:** [${principal.codigo}] ${principal.titulo} (${principal.categoria})`,
    "",
    principal.conteudo,
  ].join("\n");
}

export async function gerarResposta(
  pergunta: string,
  docs: Documento[]
): Promise<string> {
  const apiKey = getApiKey();

  if (!apiKey || docs.length === 0) {
    return respostaOffline(docs);
  }

  const systemPrompt = [
    "Você é o Copiloto Northa, assistente corporativo da Northa Soluções Logísticas.",
    "Responda APENAS com base nos documentos internos fornecidos no contexto.",
    "Se a informação não estiver no contexto, diga que não encontrou na base e sugira contatar RH ou TI.",
    "Cite o código do documento usado (ex: RH-01, TI-02) de forma clara na resposta.",
    "Responda em português do Brasil, de forma objetiva e profissional.",
    "",
    "Documentos de contexto:",
    montarContexto(docs),
  ].join("\n");

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      body: JSON.stringify({
        max_tokens: 1024,
        messages: [{ content: pergunta, role: "user" }],
        model: ANTHROPIC_MODEL,
        system: systemPrompt,
      }),
      headers: {
        "anthropic-dangerous-direct-browser-access": "true",
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      method: "POST",
    });

    if (!response.ok) {
      return respostaOffline(docs);
    }

    const data = (await response.json()) as AnthropicResponse;
    const texto = data.content
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text)
      .join("\n")
      .trim();

    return texto || respostaOffline(docs);
  } catch {
    return respostaOffline(docs);
  }
}
