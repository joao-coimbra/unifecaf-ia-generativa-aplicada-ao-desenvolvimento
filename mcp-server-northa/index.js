#!/usr/bin/env node
/**
 * Servidor MCP — Base de Conhecimento Northa
 *
 * Expõe a base de conhecimento interna da empresa fictícia "Northa Soluções
 * Logísticas" (RH, TI, Operações, Compliance) como uma ferramenta MCP, para
 * ser usada por qualquer cliente compatível (Claude Desktop, Claude Code,
 * outros agentes).
 *
 * Este servidor é a evidência prática de uso de MCP no processo de
 * desenvolvimento do "Copiloto Corporativo Northa" — mostra um agente de IA
 * consultando uma fonte de dados externa via protocolo MCP, o mesmo conceito
 * usado na aplicação principal (TanStack Start / Copiloto Northa).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Mesma base de conhecimento usada na aplicação (ver pasta ../documentos-northa)
const DOCUMENTOS = [
  {
    categoria: "RH",
    codigo: "RH-01",
    conteudo:
      "Todo colaborador tem direito a 30 dias corridos de férias após completar 12 meses de trabalho na Northa. As férias devem ser solicitadas com no mínimo 30 dias de antecedência pelo portal do RH (rh.northa.com/ferias), com aprovação do gestor direto. É permitido o fracionamento em até 3 períodos, sendo um deles de no mínimo 14 dias corridos. É possível vender até 1/3 das férias (abono pecuniário).",
    titulo: "Política de Férias",
  },
  {
    categoria: "RH",
    codigo: "RH-02",
    conteudo:
      "A Northa oferece plano de saúde e odontológico (Bradesco Saúde), vale-refeição de R$ 35/dia útil, vale-transporte ou auxílio-combustível, Gympass (categoria Silver) e day off na semana do aniversário. Os benefícios começam a valer no primeiro dia útil após a admissão, exceto o plano de saúde, que tem carência de 30 dias para procedimentos eletivos.",
    titulo: "Benefícios Corporativos",
  },
  {
    categoria: "RH",
    codigo: "RH-03",
    conteudo:
      "Colaboradores das áreas administrativas podem trabalhar em regime híbrido: 3 dias presenciais e 2 dias remotos por semana, mediante acordo com o gestor direto. Áreas operacionais (armazém, frota, pátio de carga) não são elegíveis para home office. Colaboradores em regime híbrido têm direito a auxílio único de R$ 500 para montagem do home office.",
    titulo: "Política de Home Office e Trabalho Híbrido",
  },
  {
    categoria: "TI",
    codigo: "TI-01",
    conteudo:
      "Para solicitar notebook, monitor ou periféricos, abra um chamado no portal de TI (portal.northa.com/ti), categoria 'Equipamentos'. O prazo médio de entrega é de 5 dias úteis. Equipamentos com defeito devem ser reportados como 'Incidente' para troca ou reparo em até 48 horas.",
    titulo: "Solicitação de Equipamentos de TI",
  },
  {
    categoria: "TI",
    codigo: "TI-02",
    conteudo:
      "Para redefinir a senha corporativa, acesse portal.northa.com/senha e siga a verificação em duas etapas via e-mail corporativo. Após 5 tentativas incorretas, a conta é bloqueada automaticamente; é necessário abrir chamado com a TI (categoria 'Acesso e Login') para desbloqueio manual, feito em até 2 horas úteis.",
    titulo: "Redefinição de Senha Corporativa",
  },
  {
    categoria: "TI",
    codigo: "TI-03",
    conteudo:
      "O acesso VPN é liberado automaticamente para colaboradores em home office aprovado pelo gestor. O cliente utilizado é o GlobalProtect, instalado via portal de TI ('Acesso Remoto'). É proibido compartilhar credenciais de VPN com terceiros; o uso é monitorado e auditado.",
    titulo: "Acesso VPN",
  },
  {
    categoria: "Operações",
    codigo: "OPS-01",
    conteudo:
      "Em caso de acidente: 1) preste primeiros socorros e acione o SAMU (192) em emergências; 2) comunique imediatamente o gestor e o SESMT pelo ramal 4040; 3) não remova o colaborador acidentado sem orientação médica em casos graves; 4) a CAT (Comunicação de Acidente de Trabalho) deve ser preenchida em até 24 horas.",
    titulo: "Procedimento em Caso de Acidente de Trabalho",
  },
  {
    categoria: "Operações",
    codigo: "OPS-02",
    conteudo:
      "É obrigatório o uso de EPI (capacete, colete refletivo, botina de segurança com bico de aço) em todas as áreas de armazém e pátio de carga. Os EPIs são fornecidos gratuitamente. O não uso gera advertência formal, conforme o Código de Conduta.",
    titulo: "Uso de Equipamento de Proteção Individual (EPI)",
  },
  {
    categoria: "Compliance",
    codigo: "COMP-01",
    conteudo:
      "A Northa possui tolerância zero a assédio, discriminação e conflito de interesses não declarado. Violações devem ser reportadas pelo Canal de Ética (etico.northa.com), que garante confidencialidade, denúncias anônimas e proteção contra retaliação.",
    titulo: "Código de Conduta",
  },
  {
    categoria: "Compliance",
    codigo: "COMP-02",
    conteudo:
      "Colaboradores podem receber brindes institucionais de até R$ 200 de fornecedores, sem necessidade de aprovação prévia. Valores acima disso devem ser recusados ou reportados ao Compliance antes do aceite. É vedado aceitar presentes em dinheiro ou vale-presente.",
    titulo: "Política de Presentes e Brindes",
  },
];

/** Busca simples por relevância textual (contagem de termos em comum). */
function buscarDocumentos(pergunta, limite = 3) {
  const termos = pergunta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .split(/\W+/)
    .filter((t) => t.length > 2);

  const pontuados = DOCUMENTOS.map((doc) => {
    const textoBusca = `${doc.titulo} ${doc.categoria} ${doc.conteudo}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");

    const pontuacao = termos.reduce(
      (acc, termo) => acc + (textoBusca.includes(termo) ? 1 : 0),
      0
    );

    return { ...doc, pontuacao };
  });

  return pontuados
    .filter((d) => d.pontuacao > 0)
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, limite);
}

const server = new McpServer({
  name: "northa-knowledge-base",
  version: "1.0.0",
});

server.registerTool(
  "buscar_documento_northa",
  {
    description:
      "Busca na base de conhecimento interna da Northa Soluções Logísticas (RH, TI, Operações, Compliance) os documentos mais relevantes para responder a uma pergunta em linguagem natural de um colaborador.",
    inputSchema: {
      pergunta: z
        .string()
        .describe(
          "Pergunta do colaborador em linguagem natural, ex: 'quantos dias de férias eu tenho?'"
        ),
    },
    title: "Buscar documento interno da Northa",
  },
  async ({ pergunta }) => {
    const resultados = buscarDocumentos(pergunta);

    if (resultados.length === 0) {
      return {
        content: [
          {
            text: "Nenhum documento da base de conhecimento da Northa foi encontrado para essa pergunta. Sugira ao usuário contatar o RH ou a TI diretamente.",
            type: "text",
          },
        ],
      };
    }

    const texto = resultados
      .map(
        (doc) =>
          `[${doc.codigo}] ${doc.titulo} (${doc.categoria})\n${doc.conteudo}`
      )
      .join("\n\n---\n\n");

    return {
      content: [{ text: texto, type: "text" }],
    };
  }
);

server.registerTool(
  "listar_categorias_northa",
  {
    description:
      "Lista todas as categorias e documentos disponíveis na base de conhecimento da Northa.",
    inputSchema: {},
    title: "Listar categorias de documentos da Northa",
  },
  async () => {
    const porCategoria = DOCUMENTOS.reduce((acc, doc) => {
      acc[doc.categoria] = acc[doc.categoria] || [];
      acc[doc.categoria].push(`${doc.codigo} — ${doc.titulo}`);
      return acc;
    }, {});

    const texto = Object.entries(porCategoria)
      .map(([categoria, docs]) => `${categoria}:\n  - ${docs.join("\n  - ")}`)
      .join("\n\n");

    return { content: [{ text: texto, type: "text" }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
