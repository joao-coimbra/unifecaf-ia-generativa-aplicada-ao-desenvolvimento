import {
  chat,
  chatParamsFromRequest,
  toServerSentEventsResponse,
} from "@tanstack/ai";
import { createAnthropicChat } from "@tanstack/ai-anthropic";
import { createGeminiChat } from "@tanstack/ai-gemini";
import { createFileRoute } from "@tanstack/react-router";

import { formatarErroIa } from "../../lib/ai-errors";
import { type AiProvider, isAiProvider } from "../../lib/ai-provider";
import {
  northaServerTools,
  SYSTEM_PROMPT_NORTHA,
} from "../../lib/northa-tools";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
/**
 * Flash-Lite: cota free-tier separada do `gemini-2.5-flash` (que estoura em ~20 req/dia).
 */
const GEMINI_MODEL = "gemini-2.5-flash-lite";

function resolveProvider(
  request: Request,
  forwardedProps: Record<string, unknown>
): AiProvider | null {
  const fromProps = forwardedProps.provider;
  if (isAiProvider(fromProps)) {
    return fromProps;
  }

  const fromHeader = request.headers.get("x-ai-provider")?.trim();
  if (isAiProvider(fromHeader)) {
    return fromHeader;
  }

  const preferred = process.env.AI_PROVIDER?.trim();
  if (isAiProvider(preferred)) {
    return preferred;
  }

  if (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.VITE_GEMINI_API_KEY?.trim()
  ) {
    return "gemini";
  }

  if (
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.VITE_ANTHROPIC_API_KEY?.trim()
  ) {
    return "anthropic";
  }

  return null;
}

function resolveApiKey(request: Request, provider: AiProvider): string | null {
  const headerKey = request.headers.get("x-api-key")?.trim();
  if (headerKey) {
    return headerKey;
  }

  if (provider === "gemini") {
    return (
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.VITE_GEMINI_API_KEY?.trim() ||
      process.env.VITE_GOOGLE_API_KEY?.trim() ||
      null
    );
  }

  return (
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.VITE_ANTHROPIC_API_KEY?.trim() ||
    null
  );
}

function criarAdapter(provider: AiProvider, apiKey: string) {
  if (provider === "gemini") {
    return createGeminiChat(GEMINI_MODEL, apiKey);
  }

  return createAnthropicChat(ANTHROPIC_MODEL, apiKey);
}

function modelOptionsPara(provider: AiProvider) {
  if (provider === "gemini") {
    return {
      maxOutputTokens: 1536,
      thinkingConfig: { thinkingBudget: 0 },
    };
  }

  return { max_tokens: 2048 };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages, forwardedProps } =
            await chatParamsFromRequest(request);
          const provider = resolveProvider(request, forwardedProps);

          if (!provider) {
            return Response.json(
              {
                error:
                  "Provedor de IA não informado. Escolha Claude ou Gemini em Configurar chave da API.",
              },
              { status: 400 }
            );
          }

          const apiKey = resolveApiKey(request, provider);

          if (!apiKey) {
            return Response.json(
              {
                error:
                  "Chave da API obrigatória. Configure Claude (Anthropic) ou Gemini (Google) na barra lateral, ou defina ANTHROPIC_API_KEY / GEMINI_API_KEY no ambiente.",
              },
              { status: 401 }
            );
          }

          const stream = chat({
            adapter: criarAdapter(provider, apiKey),
            messages,
            modelOptions: modelOptionsPara(provider),
            systemPrompts: [SYSTEM_PROMPT_NORTHA],
            tools: northaServerTools,
          });

          return toServerSentEventsResponse(stream);
        } catch (error) {
          if (error instanceof Response) {
            return error;
          }

          const message = formatarErroIa(error);
          const isQuota = message.includes("Limite da API Gemini");

          return Response.json(
            { error: message },
            { status: isQuota ? 429 : 500 }
          );
        }
      },
    },
  },
});
