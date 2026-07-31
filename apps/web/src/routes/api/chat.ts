import {
  chat,
  chatParamsFromRequest,
  toServerSentEventsResponse,
} from "@tanstack/ai";
import { createAnthropicChat } from "@tanstack/ai-anthropic";
import { createFileRoute } from "@tanstack/react-router";

import {
  northaServerTools,
  SYSTEM_PROMPT_NORTHA,
} from "../../lib/northa-tools";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

function resolveApiKey(request: Request): string | null {
  const headerKey = request.headers.get("x-api-key")?.trim();
  if (headerKey) {
    return headerKey;
  }

  const envKey =
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.VITE_ANTHROPIC_API_KEY?.trim();

  return envKey || null;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = resolveApiKey(request);

        if (!apiKey) {
          return Response.json(
            {
              error:
                "Chave da API Anthropic não configurada. Use Configurar chave da API na barra lateral ou defina ANTHROPIC_API_KEY no ambiente.",
            },
            { status: 401 }
          );
        }

        try {
          const { messages } = await chatParamsFromRequest(request);

          const stream = chat({
            adapter: createAnthropicChat(ANTHROPIC_MODEL, apiKey),
            messages,
            modelOptions: {
              max_tokens: 2048,
            },
            systemPrompts: [SYSTEM_PROMPT_NORTHA],
            tools: northaServerTools,
          });

          return toServerSentEventsResponse(stream);
        } catch (error) {
          if (error instanceof Response) {
            return error;
          }

          const message =
            error instanceof Error
              ? error.message
              : "Falha ao processar a conversa com a IA.";

          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
