import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

import { type Documento, documentos } from "./knowledge-base";
import { buscarDocumentos } from "./search";

/** Mesmas ferramentas do servidor MCP (`mcp-server-northa`). */
export const buscarDocumentoNorthaDef = toolDefinition({
  description:
    "Busca na base de conhecimento interna da Northa Soluções Logísticas (RH, TI, Operações, Compliance) os documentos mais relevantes para responder a uma pergunta em linguagem natural de um colaborador.",
  inputSchema: z.object({
    pergunta: z
      .string()
      .describe(
        "Pergunta do colaborador em linguagem natural, ex: 'quantos dias de férias eu tenho?'"
      ),
  }),
  name: "buscar_documento_northa",
  outputSchema: z.object({
    documentos: z.array(
      z.object({
        categoria: z.string(),
        codigo: z.string(),
        conteudo: z.string(),
        titulo: z.string(),
      })
    ),
    encontrado: z.boolean(),
    mensagem: z.string().optional(),
  }),
});

export const listarCategoriasNorthaDef = toolDefinition({
  description:
    "Lista todas as categorias e documentos disponíveis na base de conhecimento da Northa.",
  inputSchema: z.object({}),
  name: "listar_categorias_northa",
  outputSchema: z.object({
    categorias: z.array(
      z.object({
        documentos: z.array(
          z.object({
            codigo: z.string(),
            titulo: z.string(),
          })
        ),
        nome: z.string(),
      })
    ),
  }),
});

export function formatarDocumentosParaTexto(docs: Documento[]): string {
  return docs
    .map(
      (doc) =>
        `[${doc.codigo}] ${doc.titulo} (${doc.categoria})\n${doc.conteudo}`
    )
    .join("\n\n---\n\n");
}

export const buscarDocumentoNortha = buscarDocumentoNorthaDef.server(
  ({ pergunta }) => {
    const resultados = buscarDocumentos(pergunta);

    if (resultados.length === 0) {
      return {
        documentos: [],
        encontrado: false,
        mensagem:
          "Nenhum documento da base de conhecimento da Northa foi encontrado para essa pergunta. Sugira ao usuário contatar o RH ou a TI diretamente.",
      };
    }

    return {
      documentos: resultados.map((doc) => ({
        categoria: doc.categoria,
        codigo: doc.codigo,
        conteudo: doc.conteudo,
        titulo: doc.titulo,
      })),
      encontrado: true,
    };
  }
);

export const listarCategoriasNortha = listarCategoriasNorthaDef.server(() => {
  const porCategoria = new Map<
    string,
    Array<{ codigo: string; titulo: string }>
  >();

  for (const doc of documentos) {
    const lista = porCategoria.get(doc.categoria) ?? [];
    lista.push({ codigo: doc.codigo, titulo: doc.titulo });
    porCategoria.set(doc.categoria, lista);
  }

  return {
    categorias: [...porCategoria.entries()].map(([nome, docs]) => ({
      documentos: docs,
      nome,
    })),
  };
});

export const northaServerTools = [
  buscarDocumentoNortha,
  listarCategoriasNortha,
];

export const SYSTEM_PROMPT_NORTHA = [
  "Você é o Copiloto Northa, assistente corporativo da Northa Soluções Logísticas.",
  "Sempre use a ferramenta buscar_documento_northa antes de responder perguntas sobre políticas, benefícios, TI, operações ou compliance.",
  "Responda APENAS com base nos documentos retornados pelas ferramentas.",
  "Se a informação não estiver nos documentos, diga que não encontrou na base e sugira contatar RH ou TI.",
  "Cite o código do documento usado (ex: RH-01, TI-02) de forma clara na resposta.",
  "Responda em português do Brasil, de forma objetiva e profissional.",
].join("\n");
