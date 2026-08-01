import type { UIMessage } from "@tanstack/ai-react";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import {
  Avatar,
  AvatarFallback,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/avatar";
import { Badge } from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/badge";
import {
  Bubble,
  BubbleContent,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/bubble";
import { Button } from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/empty";
import { Input } from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/input-group";
import { Label } from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/label";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/message-scroller";
import { ScrollArea } from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/scroll-area";
import { Separator } from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/sheet";
import { Spinner } from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/spinner";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/toggle-group";
import {
  BotIcon,
  CopyIcon,
  InfoIcon,
  KeyRoundIcon,
  MenuIcon,
  SendIcon,
  WarehouseIcon,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import {
  type AiProvider,
  isAiProvider,
  placeholderChave,
  rotuloConsoleProvedor,
  rotuloProvedor,
  urlConsoleProvedor,
} from "../lib/ai-provider";
import {
  type ApiKeySource,
  clearStoredConfig,
  getActiveProvider,
  getApiKeySource,
  getChatAuthHeaders,
  getStoredApiKey,
  getStoredProvider,
  setStoredConfig,
} from "../lib/api-key";
import { type Categoria, categorias } from "../lib/knowledge-base";
import { AtividadeMcp, documentosLidosDaMensagem } from "./atividade-mcp";
import { ThemeToggle } from "./theme-toggle";

const PERGUNTAS_RAPIDAS = [
  "Quantos dias de férias eu tenho?",
  "Como solicito um notebook?",
  "O que fazer em caso de acidente de trabalho?",
  "Posso trabalhar em home office?",
  "Qual o limite de presentes de fornecedores?",
  "Como redefinir minha senha corporativa?",
] as const;

const CATEGORIA_VARIANT: Record<
  Categoria,
  "default" | "secondary" | "outline" | "destructive"
> = {
  Compliance: "destructive",
  Operações: "outline",
  RH: "default",
  TI: "secondary",
};

const BOLD_MARKDOWN_REGEX = /\*\*(.*?)\*\*/g;

function rotuloFonte(fonte: ApiKeySource, provider: AiProvider | null): string {
  if (fonte === "none" || !provider) {
    return "Chave de API necessária";
  }
  if (fonte === "local") {
    return `${rotuloProvedor(provider)} · sua chave`;
  }
  return `${rotuloProvedor(provider)} · ambiente`;
}

function rotuloBadge(fonte: ApiKeySource, provider: AiProvider | null): string {
  if (fonte === "none" || !provider) {
    return "Sem chave de API";
  }
  return provider === "anthropic" ? "Claude ativo" : "Gemini ativo";
}

function textoDaMensagem(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { content: string; type: "text" } => part.type === "text"
    )
    .map((part) => part.content)
    .join("\n")
    .trim();
}

function estaConsultandoBase(message: UIMessage | undefined): boolean {
  if (message?.role !== "assistant") {
    return false;
  }

  return message.parts.some(
    (part) =>
      part.type === "tool-call" &&
      part.name === "buscar_documento_northa" &&
      (part.state === "awaiting-input" ||
        part.state === "input-streaming" ||
        part.state === "input-complete")
  );
}

function PerguntaRapidaButton({
  disabled,
  pergunta,
  onSelect,
}: {
  disabled: boolean;
  pergunta: string;
  onSelect: (pergunta: string) => void;
}) {
  const handleClick = useEffectEvent(() => {
    onSelect(pergunta);
  });

  return (
    <Button
      className="h-auto justify-start whitespace-normal px-3 py-2 text-left"
      disabled={disabled}
      onClick={handleClick}
      type="button"
      variant="outline"
    >
      {pergunta}
    </Button>
  );
}

/**
 * Avatar no topo da mensagem (self-start). O default do MessageAvatar é
 * self-end + -translate-y-8 com footer — fica estranho com anexos MCP altos.
 */
function AvatarDaMensagem({ isUser }: { isUser: boolean }) {
  return (
    <MessageAvatar className="self-start group-has-data-[slot=message-footer]/message:translate-y-0">
      <Avatar aria-label={isUser ? "Você" : "Copiloto Northa"}>
        <AvatarFallback className="[&>svg]:size-4">
          {isUser ? "EU" : <BotIcon />}
        </AvatarFallback>
      </Avatar>
    </MessageAvatar>
  );
}

function ApiKeyDialog({
  onSaved,
  open,
  onOpenChange,
}: {
  onSaved: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [provedor, setProvedor] = useState<AiProvider>("gemini");
  const [rascunho, setRascunho] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setProvedor(getStoredProvider() ?? getActiveProvider() ?? "gemini");
      setRascunho(getStoredApiKey() ?? "");
      setMensagem(null);
    }
  }, [open]);

  const handleSalvar = useEffectEvent((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valor = rascunho.trim();
    if (!valor) {
      setMensagem(`Cole uma chave válida de ${rotuloProvedor(provedor)}.`);
      return;
    }

    setStoredConfig(provedor, valor);
    setMensagem("Chave salva neste navegador.");
    onSaved();
    onOpenChange(false);
    toast.success(
      `${rotuloProvedor(provedor)} conectado — plataforma liberada.`
    );
  });

  const handleRemover = useEffectEvent(() => {
    clearStoredConfig();
    setRascunho("");
    setMensagem("Chave removida.");
    onSaved();
    toast.message("Chave removida — configure uma chave para continuar.");
  });

  const handleRascunhoChange = useEffectEvent(
    (event: ChangeEvent<HTMLInputElement>) => {
      setRascunho(event.target.value);
      setMensagem(null);
    }
  );

  const handleProvedorChange = useEffectEvent((values: string[]) => {
    const [proximo] = values;
    if (isAiProvider(proximo)) {
      setProvedor(proximo);
      setMensagem(null);
    }
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar provedor de IA</DialogTitle>
          <DialogDescription>
            Escolha Claude (Anthropic) ou Gemini (Google) e cole a chave
            correspondente. Ela fica salva neste navegador e é enviada ao
            servidor da aplicação (não fica embutida no código).
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-3" onSubmit={handleSalvar}>
          <div className="flex flex-col gap-2">
            <Label>Provedor</Label>
            <ToggleGroup
              className="grid w-full grid-cols-2"
              onValueChange={handleProvedorChange}
              spacing={0}
              value={[provedor]}
              variant="outline"
            >
              <ToggleGroupItem className="w-full" value="anthropic">
                Claude
              </ToggleGroupItem>
              <ToggleGroupItem className="w-full" value="gemini">
                Gemini
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ai-api-key">
              Chave da API · {rotuloProvedor(provedor)}
            </Label>
            <Input
              autoComplete="off"
              id="ai-api-key"
              onChange={handleRascunhoChange}
              placeholder={placeholderChave(provedor)}
              spellCheck={false}
              type="password"
              value={rascunho}
            />
            {mensagem ? (
              <p className="text-muted-foreground text-xs">{mensagem}</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Obtenha a chave em{" "}
                <a
                  className="underline underline-offset-2"
                  href={urlConsoleProvedor(provedor)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {rotuloConsoleProvedor(provedor)}
                </a>
                .
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button onClick={handleRemover} type="button" variant="outline">
              Remover chave
            </Button>
            <Button type="submit">Salvar e conectar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SidebarContent({
  fonteChave,
  provedor,
  onPerguntaRapida,
  onConfigurarChave,
}: {
  fonteChave: ApiKeySource;
  provedor: AiProvider | null;
  onPerguntaRapida: (pergunta: string) => void;
  onConfigurarChave: () => void;
}) {
  const iaAtiva = fonteChave !== "none";

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <WarehouseIcon />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-sm tracking-tight">
              Copiloto Northa
            </p>
            <p className="truncate text-muted-foreground text-xs">
              Northa Soluções Logísticas
            </p>
          </div>
        </div>

        <Badge variant={iaAtiva ? "default" : "outline"}>
          {rotuloFonte(fonteChave, provedor)}
        </Badge>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <p className="font-medium text-muted-foreground text-xs">Categorias</p>
        <div className="flex flex-wrap gap-2">
          {categorias.map((categoria) => (
            <Badge key={categoria} variant={CATEGORIA_VARIANT[categoria]}>
              {categoria}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <p className="font-medium text-muted-foreground text-xs">
          Perguntas rápidas
        </p>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-2 pr-2">
            {PERGUNTAS_RAPIDAS.map((pergunta) => (
              <PerguntaRapidaButton
                disabled={!iaAtiva}
                key={pergunta}
                onSelect={onPerguntaRapida}
                pergunta={pergunta}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      <div className="flex flex-col gap-1">
        <Button
          className="justify-start"
          onClick={onConfigurarChave}
          type="button"
          variant="ghost"
        >
          <KeyRoundIcon data-icon="inline-start" />
          Configurar API KEY
        </Button>

        <Dialog>
          <DialogTrigger
            render={<Button className="justify-start" variant="ghost" />}
          >
            <InfoIcon data-icon="inline-start" />
            Sobre este projeto
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Sobre o Copiloto Northa</DialogTitle>
              <DialogDescription>
                Aplicação acadêmica da disciplina IA Generativa Aplicada ao
                Desenvolvimento (UniFECAF). O chat usa TanStack AI (`useChat` +
                SSE) com Claude ou Gemini e ferramentas equivalentes ao MCP
                (`buscar_documento_northa`) sobre a base interna. É necessário
                configurar uma chave de API (Anthropic ou Google) para utilizar
                a plataforma.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ConteudoMensagem({ content }: { content: string }) {
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {content.split("\n").map((linha, index) => {
        const key = `${index}-${linha.slice(0, 12)}`;
        const negrito = linha.replace(BOLD_MARKDOWN_REGEX, "$1");
        const temNegrito = linha.includes("**");

        return (
          <p className={temNegrito ? "font-medium" : undefined} key={key}>
            {negrito || "\u00A0"}
          </p>
        );
      })}
    </div>
  );
}

function EmptyState({
  iaAtiva,
  onConfigurarChave,
}: {
  iaAtiva: boolean;
  onConfigurarChave: () => void;
}) {
  if (iaAtiva) {
    return (
      <Empty className="w-full border-0 bg-transparent py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BotIcon />
          </EmptyMedia>
          <EmptyTitle>Como posso ajudar?</EmptyTitle>
          <EmptyDescription>
            Pergunte sobre políticas de RH, TI, Operações ou Compliance. A IA
            consulta a base via ferramenta MCP{" "}
            <strong>buscar_documento_northa</strong> antes de responder.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Empty className="w-full border-0 bg-transparent py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <KeyRoundIcon />
        </EmptyMedia>
        <EmptyTitle>Chave de API necessária</EmptyTitle>
        <EmptyDescription>
          Para utilizar o Copiloto Northa, configure uma chave Claude
          (Anthropic) ou Gemini (Google). Sem chave, a plataforma permanece
          bloqueada — não há modo offline.
        </EmptyDescription>
      </EmptyHeader>
      <Button className="mt-2" onClick={onConfigurarChave} type="button">
        <KeyRoundIcon data-icon="inline-start" />
        Configurar API KEY
      </Button>
    </Empty>
  );
}

function MensagemAiItem({
  consultandoBase,
  digitando,
  isUltima,
  mensagem,
}: {
  consultandoBase: boolean;
  digitando: boolean;
  isUltima: boolean;
  mensagem: UIMessage;
}) {
  const isUser = mensagem.role === "user";
  const texto = textoDaMensagem(mensagem);
  const documentos = isUser ? [] : documentosLidosDaMensagem(mensagem);
  const animarAtividade = !isUser && digitando && isUltima;
  const consultando =
    animarAtividade && (consultandoBase || estaConsultandoBase(mensagem));
  const [leituraCompleta, setLeituraCompleta] = useState(!animarAtividade);

  useEffect(() => {
    if (!animarAtividade) {
      setLeituraCompleta(true);
    }
  }, [animarAtividade]);

  const handleLeituraCompleta = useEffectEvent((completa: boolean) => {
    setLeituraCompleta(completa);
  });

  const handleCopiar = useEffectEvent(async () => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Resposta copiada.");
    } catch {
      toast.error("Não foi possível copiar a resposta.");
    }
  });

  // Resposta só depois da leitura dos arquivos (fluxo típico de chatbot + tools).
  const podeMostrarResposta =
    Boolean(texto) &&
    (documentos.length === 0 || leituraCompleta || !animarAtividade);

  return (
    <MessageScrollerItem
      className="[contain-intrinsic-size:none] [content-visibility:visible]"
      messageId={mensagem.id}
      scrollAnchor={isUser}
    >
      <Message align={isUser ? "end" : "start"}>
        <AvatarDaMensagem isUser={isUser} />
        <MessageContent>
          <MessageHeader>{isUser ? "Você" : "Copiloto"}</MessageHeader>

          {isUser ? null : (
            <AtividadeMcp
              animar={animarAtividade}
              consultando={consultando}
              documentos={documentos}
              onLeituraCompleta={handleLeituraCompleta}
            />
          )}

          {podeMostrarResposta ? (
            <Bubble
              align={isUser ? "end" : "start"}
              variant={isUser ? "default" : "muted"}
            >
              <BubbleContent>
                <ConteudoMensagem content={texto} />
              </BubbleContent>
            </Bubble>
          ) : null}

          {podeMostrarResposta && !isUser ? (
            <div className="flex items-center px-1">
              <Button
                aria-label="Copiar resposta"
                onClick={handleCopiar}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <CopyIcon />
              </Button>
            </div>
          ) : null}
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
}

export function CopilotoNortha() {
  const [entrada, setEntrada] = useState("");
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [fonteChave, setFonteChave] = useState<ApiKeySource>("none");
  const [provedor, setProvedor] = useState<AiProvider | null>(null);
  const [dialogChaveAberto, setDialogChaveAberto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const entradaRef = useRef(entrada);
  const fonteChaveRef = useRef(fonteChave);
  const isLoadingRef = useRef(false);

  entradaRef.current = entrada;
  fonteChaveRef.current = fonteChave;

  const {
    messages: aiMessages,
    sendMessage,
    isLoading,
    error,
    clear,
  } = useChat({
    connection: fetchServerSentEvents("/api/chat", () => ({
      headers: getChatAuthHeaders(),
    })),
    forwardedProps: {
      provider: provedor ?? "gemini",
    },
  });

  isLoadingRef.current = isLoading;

  useEffect(() => {
    setFonteChave(getApiKeySource());
    setProvedor(getActiveProvider());
  }, []);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const raw = error.message || "Falha na conexão com a IA.";
    const lower = raw.toLowerCase();
    const isQuota =
      lower.includes("resource_exhausted") ||
      lower.includes("quota") ||
      lower.includes("rate limit") ||
      lower.includes("429") ||
      lower.includes("too many requests") ||
      lower.includes("limite da api gemini");

    toast.error(
      isQuota
        ? "Limite da API Gemini atingido. Aguarde um pouco ou troque a chave — o app já usa gemini-2.5-flash-lite."
        : raw
    );
  }, [error]);

  const sincronizarFonteChave = useEffectEvent(() => {
    const proxima = getApiKeySource();
    const proximoProvedor = getActiveProvider();
    setFonteChave(proxima);
    setProvedor(proximoProvedor);
    if (proxima === "none") {
      clear();
    }
  });

  const abrirConfiguracaoChave = useEffectEvent(() => {
    setDialogChaveAberto(true);
  });

  const enviarPergunta = useEffectEvent(async (perguntaBruta: string) => {
    const pergunta = perguntaBruta.trim();
    if (!pergunta) {
      return;
    }

    if (fonteChaveRef.current === "none") {
      toast.message("Configure uma chave da API para utilizar a plataforma.");
      setDialogChaveAberto(true);
      return;
    }

    if (isLoadingRef.current) {
      return;
    }

    setEntrada("");
    setSidebarAberta(false);

    try {
      await sendMessage(pergunta);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao enviar a pergunta.";
      toast.error(message);
    }
  });

  const handlePerguntaRapida = useEffectEvent((pergunta: string) => {
    enviarPergunta(pergunta).catch(() => undefined);
  });

  const handleSubmit = useEffectEvent((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    enviarPergunta(entradaRef.current).catch(() => undefined);
  });

  const handleEntradaChange = useEffectEvent(
    (event: ChangeEvent<HTMLInputElement>) => {
      setEntrada(event.target.value);
    }
  );

  const handleLimpar = useEffectEvent(() => {
    clear();
  });

  const iaAtiva = fonteChave !== "none";
  const digitando = isLoading;
  const ultimaAi = aiMessages.at(-1);
  const consultandoBase = iaAtiva && estaConsultandoBase(ultimaAi);
  const temMensagens = aiMessages.length > 0;
  const mostrarEmpty = !digitando && aiMessages.length === 0;

  return (
    <div className="relative flex h-svh overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_12%_8%,oklch(from_var(--primary)_l_c_h/0.14),transparent_55%),radial-gradient(ellipse_70%_50%_at_88%_12%,oklch(from_var(--accent)_l_c_h/0.18),transparent_50%),radial-gradient(ellipse_90%_55%_at_50%_100%,oklch(from_var(--muted-foreground)_l_c_h/0.10),transparent_55%)]"
      />
      <div
        aria-hidden
        className="mask-[radial-gradient(ellipse_at_center,black_35%,transparent_80%)] pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,oklch(from_var(--foreground)_l_c_h/0.16)_1px,transparent_0)] bg-size-[20px_20px] opacity-[0.5] dark:opacity-[0.32]"
      />

      <ApiKeyDialog
        onOpenChange={setDialogChaveAberto}
        onSaved={sincronizarFonteChave}
        open={dialogChaveAberto}
      />

      <aside className="relative z-10 hidden w-80 shrink-0 border-border/80 border-r bg-sidebar/90 p-4 backdrop-blur-md md:flex md:flex-col">
        <SidebarContent
          fonteChave={fonteChave}
          onConfigurarChave={abrirConfiguracaoChave}
          onPerguntaRapida={handlePerguntaRapida}
          provedor={provedor}
        />
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-border/80 border-b bg-background/75 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Sheet onOpenChange={setSidebarAberta} open={sidebarAberta}>
              <SheetTrigger
                render={
                  <Button
                    className="md:hidden"
                    size="icon-sm"
                    variant="outline"
                  />
                }
              >
                <MenuIcon />
                <span className="sr-only">Abrir menu</span>
              </SheetTrigger>
              <SheetContent className="w-80 p-4" side="left">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu Copiloto Northa</SheetTitle>
                </SheetHeader>
                <SidebarContent
                  fonteChave={fonteChave}
                  onConfigurarChave={abrirConfiguracaoChave}
                  onPerguntaRapida={handlePerguntaRapida}
                  provedor={provedor}
                />
              </SheetContent>
            </Sheet>

            <div>
              <h1 className="font-semibold text-sm tracking-tight md:text-base">
                Copiloto Northa
              </h1>
              <p className="text-muted-foreground text-xs">
                TanStack AI · tools MCP · base Northa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {temMensagens ? (
              <Button onClick={handleLimpar} size="sm" variant="ghost">
                Limpar
              </Button>
            ) : null}
            <Badge variant={iaAtiva ? "default" : "outline"}>
              {rotuloBadge(fonteChave, provedor)}
            </Badge>
            <ThemeToggle />
          </div>
        </header>

        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent
                className={
                  mostrarEmpty
                    ? "mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-0 px-4 py-6"
                    : "mx-auto w-full max-w-3xl gap-6 px-4 py-6"
                }
              >
                {mostrarEmpty ? (
                  <MessageScrollerItem className="flex min-h-0 w-full flex-col items-center justify-center [contain-intrinsic-size:none] [content-visibility:visible]">
                    <EmptyState
                      iaAtiva={iaAtiva}
                      onConfigurarChave={abrirConfiguracaoChave}
                    />
                  </MessageScrollerItem>
                ) : null}

                {aiMessages.map((mensagem, index) => (
                  <MensagemAiItem
                    consultandoBase={consultandoBase}
                    digitando={digitando}
                    isUltima={index === aiMessages.length - 1}
                    key={mensagem.id}
                    mensagem={mensagem}
                  />
                ))}

                {error && iaAtiva ? (
                  <MessageScrollerItem>
                    <p className="text-destructive text-sm" role="alert">
                      Erro na IA: {error.message}
                    </p>
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <footer className="border-border/80 border-t bg-background/75 p-4 backdrop-blur-md">
          <form className="mx-auto w-full max-w-3xl" onSubmit={handleSubmit}>
            <InputGroup className="h-11">
              <InputGroupInput
                aria-label="Pergunta para o Copiloto Northa"
                className="text-sm"
                disabled={digitando || !iaAtiva}
                onChange={handleEntradaChange}
                placeholder={
                  iaAtiva
                    ? "Pergunte algo — a IA consulta a base via MCP..."
                    : "Configure uma chave da API para começar..."
                }
                ref={inputRef}
                value={entrada}
              />
              <InputGroupAddon align="inline-end">
                {iaAtiva ? (
                  <InputGroupButton
                    disabled={digitando || !entrada.trim()}
                    size="sm"
                    type="submit"
                    variant="default"
                  >
                    {digitando ? (
                      <Spinner />
                    ) : (
                      <SendIcon data-icon="inline-start" />
                    )}
                    Enviar
                  </InputGroupButton>
                ) : (
                  <InputGroupButton
                    onClick={abrirConfiguracaoChave}
                    size="sm"
                    type="button"
                    variant="default"
                  >
                    <KeyRoundIcon data-icon="inline-start" />
                    Configurar
                  </InputGroupButton>
                )}
              </InputGroupAddon>
            </InputGroup>
          </form>
        </footer>
      </div>
    </div>
  );
}
