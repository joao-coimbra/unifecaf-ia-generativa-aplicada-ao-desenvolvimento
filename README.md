# Copiloto Northa

Assistente corporativo inteligente da empresa fictícia **Northa Soluções Logísticas**. Colaboradores fazem perguntas em linguagem natural e recebem respostas contextualizadas a partir de uma base de conhecimento interna (RH, TI, Operações e Compliance).

Aplicação acadêmica da disciplina **IA Generativa Aplicada ao Desenvolvimento** (UniFECAF).

## Tecnologias utilizadas

- **Better-T-Stack** — scaffold do monorepo
- **Turborepo** — orquestração de builds e scripts
- **TanStack Start** — app React com Vite e SSR
- **React 19** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Anthropic API** (Claude) — geração de respostas
- **Bun** — runtime e gerenciador de pacotes

## Ferramentas de IA

| Contexto | Ferramentas |
| --- | --- |
| Desenvolvimento | Cursor + Claude (geração de código, refino de prompts, estruturação do monorepo) |
| Aplicação | Anthropic Messages API (`claude-sonnet-5`) com retrieval sobre documentos Markdown |
| Diferencial MCP | Servidor MCP em `mcp-server-northa/` expondo a mesma base para agentes externos |

## Como executar

### 1. Instalar dependências

```bash
bun install
```

### 2. Configurar a chave da Anthropic (opcional)

Há duas formas (a chave do navegador tem prioridade):

1. **Pelo app (recomendado para demonstração):** na barra lateral, campo **Chave da API Anthropic** → cole a chave e clique em **Salvar chave**. A chave fica só no `localStorage` do navegador de quem usa. No celular, abra o menu (ícone ☰).
2. **Por ambiente:** crie `apps/web/.env.local`:

```bash
VITE_ANTHROPIC_API_KEY=sua_chave_aqui
```

Sem nenhuma chave, o app funciona em **modo offline**: busca os documentos mais relevantes e exibe o conteúdo diretamente.

Há um exemplo em `apps/web/.env.example`.

### 3. Rodar em desenvolvimento

```bash
bun dev
```

Abra [http://localhost:3001](http://localhost:3001).

### 4. Build de produção

```bash
bun run build
```

## Prints da aplicação

> Placeholder — adicione aqui screenshots da interface (sidebar, chat, modo offline e resposta com citação de fonte).

- `[ ]` Tela inicial / empty state
- `[ ]` Conversa com citação de documento (ex.: RH-01)
- `[ ]` Indicador de status da IA (conectada / offline)
- `[ ]` Layout responsivo (mobile)

## Base de conhecimento

Documentos em `apps/web/src/data/documentos-northa/`:

| Código | Título | Categoria |
| --- | --- | --- |
| RH-01 | Política de Férias | RH |
| RH-02 | Benefícios Corporativos | RH |
| RH-03 | Home Office e Trabalho Híbrido | RH |
| TI-01 | Solicitação de Equipamentos | TI |
| TI-02 | Redefinição de Senha | TI |
| TI-03 | Acesso VPN | TI |
| OPS-01 | Acidente de Trabalho | Operações |
| OPS-02 | Uso de EPI | Operações |
| COMP-01 | Código de Conduta | Compliance |
| COMP-02 | Presentes e Brindes | Compliance |

Fluxo: **pergunta → retrieval lexical (`search.ts`) → geração (`ai.ts`) → citação da fonte na UI**.

## Servidor MCP (diferencial)

```bash
cd mcp-server-northa
npm install
npm start
```

Veja `mcp-server-northa/README.md` para conectar no Claude Desktop ou Claude Code.

## Deploy na Vercel

1. Link do projeto: `bun run deploy:setup`
2. Defina `VITE_ANTHROPIC_API_KEY` no painel da Vercel (ou sincronize com `bun run env:preview` / `bun run env:production`)
3. Preview: `bun run deploy`
4. Produção: `bun run deploy:prod`

Configuração em `vercel.json`. Variáveis locais (`.env.local`) **não** sobem automaticamente no deploy.

## Estrutura relevante

```
apps/web/
  src/
    components/copiloto-northa.tsx   # Interface do chat
    data/documentos-northa/          # Base de conhecimento (Markdown)
    lib/
      knowledge-base.ts              # Parse e export dos documentos
      search.ts                      # Retrieval por relevância
      ai.ts                          # Chamada Anthropic + fallback offline
    routes/index.tsx                 # Rota principal
mcp-server-northa/                   # Servidor MCP da mesma base
packages/ui/                         # Componentes shadcn/ui compartilhados
```

## Scripts

- `bun run dev` — desenvolvimento
- `bun run build` — build
- `bun run check` — lint/format (Ultracite)
- `bun run deploy` / `bun run deploy:prod` — deploy Vercel
