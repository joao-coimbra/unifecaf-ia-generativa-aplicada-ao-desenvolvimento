# Copiloto Northa

Assistente corporativo inteligente da empresa fictícia **Northa Soluções Logísticas**. Colaboradores fazem perguntas em linguagem natural e recebem respostas contextualizadas a partir de uma base de conhecimento interna (RH, TI, Operações e Compliance).

Aplicação acadêmica da disciplina **IA Generativa Aplicada ao Desenvolvimento** (UniFECAF).

## Tecnologias utilizadas

- **Better-T-Stack** — scaffold do monorepo
- **Turborepo** — orquestração de builds e scripts
- **TanStack Start** — app React com Vite e SSR
- **TanStack AI** — `useChat` + SSE (`fetchServerSentEvents`) + `chat()` no servidor
- **@tanstack/ai-anthropic** — adapter Anthropic (Claude)
- **@tanstack/ai-gemini** — adapter Google Gemini
- **React 19** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Bun** — runtime e gerenciador de pacotes

## Ferramentas de IA

| Contexto | Ferramentas |
| --- | --- |
| Desenvolvimento | Cursor + Claude (geração de código, refino de prompts, estruturação do monorepo) |
| Aplicação | TanStack AI + Claude (`claude-sonnet-4-6`) **ou** Gemini (`gemini-2.5-flash`) com tools isomórficas ao MCP |
| Diferencial MCP | Servidor MCP em `mcp-server-northa/` + mesmas tools no `/api/chat` |

## Fluxo de perguntas (TanStack AI)

1. O client usa `useChat` + `fetchServerSentEvents("/api/chat")` (mesmo padrão do helper [shadcn TanStack AI](https://ui.shadcn.com/docs/helpers/tanstack-ai), porém com conexão real à API).
2. A rota `POST /api/chat` escolhe o adapter (`createAnthropicChat` ou `createGeminiChat`) conforme o provedor e chama `chat()` com as tools:
   - `buscar_documento_northa`
   - `listar_categorias_northa`
3. O modelo **consulta a base via tool** antes de responder (mesmo contrato do servidor MCP).
4. A UI faz streaming SSE e exibe as fontes citadas a partir do resultado da tool.

Sem chave de API, a plataforma fica **bloqueada** — não há modo offline. É obrigatório configurar uma chave **Claude (Anthropic)** ou **Gemini (Google)** pelo modal na barra lateral, ou via variáveis de ambiente.

## Como executar

### 1. Instalar dependências

```bash
bun install
```

### 2. Configurar a chave (Claude ou Gemini)

Há duas formas (a chave do navegador tem prioridade no header `x-api-key` + `x-ai-provider`):

1. **Pelo app (recomendado para demonstração):** na barra lateral, botão **Configurar Claude ou Gemini** → escolha o provedor, cole a chave e salve.
2. **Por ambiente:** crie `apps/web/.env.local`:

```bash
# Gemini (Google)
GEMINI_API_KEY=sua_chave_aqui
AI_PROVIDER=gemini

# ou Claude (Anthropic)
# ANTHROPIC_API_KEY=sua_chave_aqui
# AI_PROVIDER=anthropic
```

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

| Tela | Arquivo |
| --- | --- |
| Chat / empty state | ![Copiloto Northa](docs/screenshots/copiloto-northa-chat.png) |
| Configurar chave da API | ![Modal da chave](docs/screenshots/configurar-chave-api.png) |
| Modal da chave (detalhe) | ![Detalhe do modal](docs/screenshots/modal-chave-api.png) |

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

## Servidor MCP (diferencial)

As mesmas tools usadas no `/api/chat` estão expostas via stdio em `mcp-server-northa/` para Claude Desktop / Claude Code:

```bash
cd mcp-server-northa
npm install
npm start
```

Veja `mcp-server-northa/README.md` para conectar no Claude Desktop ou Claude Code.

## Deploy na Vercel

1. Link do projeto: `bun run deploy:setup`
2. Defina `GEMINI_API_KEY` ou `ANTHROPIC_API_KEY` (e opcionalmente `AI_PROVIDER`) no painel da Vercel
3. Preview: `bun run deploy`
4. Produção: `bun run deploy:prod`

Configuração em `vercel.json`. Variáveis locais (`.env.local`) **não** sobem automaticamente no deploy.

## Estrutura relevante

```
apps/web/
  src/
    components/copiloto-northa.tsx   # UI + useChat (TanStack AI)
    data/documentos-northa/          # Base de conhecimento (Markdown)
    lib/
      knowledge-base.ts              # Parse e export dos documentos
      search.ts                      # Retrieval por relevância
      northa-tools.ts                # Tools MCP (TanStack AI toolDefinition)
      ai-provider.ts                 # Claude | Gemini (tipos e rótulos)
      api-key.ts                     # Chave + provedor no localStorage / env
    routes/
      index.tsx                      # Rota principal
      api/chat.ts                    # POST /api/chat (SSE + Anthropic)

mcp-server-northa/                   # Servidor MCP stdio (mesmo contrato de tools)
```
