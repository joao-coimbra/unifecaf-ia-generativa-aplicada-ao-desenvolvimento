# MCP Server — Base de Conhecimento Northa

Servidor MCP (Model Context Protocol) que expõe a base de conhecimento interna da empresa
fictícia **Northa Soluções Logísticas** (RH, TI, Operações, Compliance) como ferramenta
para agentes de IA.

Esse servidor é a evidência prática do **diferencial "Uso de MCP"** pedido no trabalho: ele
mostra um agente de IA (Claude) consultando uma fonte de dados externa via protocolo MCP —
o mesmo conceito de arquitetura usado na aplicação principal (o Copiloto Northa em
TanStack Start), só que aqui rodando fora do navegador, direto no seu ambiente de
desenvolvimento.

## Ferramentas expostas

- **`buscar_documento_northa`** — recebe uma pergunta em linguagem natural e retorna os
  documentos internos mais relevantes (com código, título, categoria e conteúdo).
- **`listar_categorias_northa`** — lista todas as categorias e documentos disponíveis.

## Como rodar localmente

```bash
cd mcp-server-northa
npm install
npm start
```

O servidor se comunica via **stdio** (entrada/saída padrão) — não é para rodar sozinho no
terminal e esperar algo acontecer; ele é iniciado automaticamente pelo cliente MCP (Claude
Desktop ou Claude Code) quando você faz a configuração abaixo.

## Como conectar no Claude Desktop

1. Abra o arquivo de configuração do Claude Desktop:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
2. Adicione (ou edite) a seção `mcpServers`:

```json
{
  "mcpServers": {
    "northa-knowledge-base": {
      "command": "node",
      "args": ["/caminho/completo/para/mcp-server-northa/index.js"]
    }
  }
}
```

3. Substitua `/caminho/completo/para/` pelo caminho real da pasta no seu computador.
4. Reinicie o Claude Desktop. O servidor "northa-knowledge-base" deve aparecer na lista de
   ferramentas disponíveis (ícone de ferramentas/plug na interface).

## Como conectar no Claude Code

No terminal, dentro do projeto (ou em qualquer diretório):

```bash
claude mcp add northa-knowledge-base -- node /caminho/completo/para/mcp-server-northa/index.js
```

Depois, dentro de uma sessão do Claude Code, use `/mcp` para confirmar que o servidor está
conectado.

## Como demonstrar no vídeo pitch

1. Mostre a configuração conectada (Claude Desktop ou `/mcp` no Claude Code).
2. Faça uma pergunta relacionada à Northa, ex: "quais são as regras de home office na
   Northa?" ou "o que fazer em caso de acidente de trabalho?".
3. Mostre o Claude chamando a ferramenta `buscar_documento_northa` (aparece como uma
   chamada de tool/ferramenta na interface) e respondendo com base no resultado retornado.
4. Explique em uma frase: "esse é o mesmo padrão de arquitetura usado dentro do Copiloto
   Northa — um agente buscando informação em uma base de conhecimento externa via MCP,
   em vez de responder de memória."

## Por que isso conta como uso de MCP no processo de desenvolvimento

O enunciado do trabalho cita MCP como diferencial. Este servidor demonstra o conceito de
forma direta e verificável: um agente de IA acessando dados corporativos por meio de uma
ferramenta padronizada (MCP), reforçando o entendimento prático do protocolo — objetivo
pedagógico da disciplina — em paralelo à aplicação web do Copiloto Northa.
