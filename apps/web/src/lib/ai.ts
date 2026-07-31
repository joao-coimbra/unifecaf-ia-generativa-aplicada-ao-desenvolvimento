import type { Documento } from "./knowledge-base";
import { formatarDocumentosParaTexto } from "./northa-tools";

/**
 * Resposta local sem chamar a Anthropic — usada só quando não há chave de API.
 * Não simula conexão com IA: deixa explícito que é modo offline.
 */
export function respostaOffline(docs: Documento[]): string {
  const [principal] = docs;

  if (!principal) {
    return "Não encontrei documentos relevantes na base de conhecimento da Northa para essa pergunta. Configure uma chave da API Anthropic para respostas com IA, ou contate o RH/TI.";
  }

  return [
    "**Modo offline** — sem chave da API Anthropic. Exibindo o documento mais relevante da base local (sem geração por IA).",
    "",
    `**Fonte:** [${principal.codigo}] ${principal.titulo} (${principal.categoria})`,
    "",
    principal.conteudo,
  ].join("\n");
}

export function montarContextoOffline(docs: Documento[]): string {
  return formatarDocumentosParaTexto(docs);
}
