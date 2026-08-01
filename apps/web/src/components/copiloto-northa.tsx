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
  MessageFooter,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/sheet";
import { Spinner } from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/spinner";
import {
  BotIcon,
  InfoIcon,
  KeyRoundIcon,
  MenuIcon,
  SendIcon,
  UserIcon,
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

interface FonteCitada {
  codigo: string;
  titulo: string;
}

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

function fontesDaMensagem(message: UIMessage): FonteCitada[] {
  const fontes: FonteCitada[] = [];
  const vistos = new Set<string>();

  for (const part of message.parts) {
    if (part.type !== "tool-call" || part.name !== "buscar_documento_northa") {
      continue;
    }

    const output = part.output as
      | {
          documentos?: Array<{ codigo?: string; titulo?: string }>;
        }
      | undefined;

    for (const doc of output?.documentos ?? []) {
      if (!(doc.codigo && doc.titulo) || vistos.has(doc.codigo)) {
        continue;
      }
      vistos.add(doc.codigo);
      fontes.push({ codigo: doc.codigo, titulo: doc.titulo });
    }
  }

  return fontes;
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

function ProvedorOptionButton({
  ativo,
  label,
  provider,
  onSelect,
}: {
  ativo: boolean;
  label: string;
  provider: AiProvider;
  onSelect: (provider: AiProvider) => void;
}) {
  const handleClick = useEffectEvent(() => {
    onSelect(provider);
  });

  return (
    <Button
      onClick={handleClick}
      type="button"
      variant={ativo ? "default" : "outline"}
    >
      {label}
    </Button>
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

  const handleProvedorChange = useEffectEvent((proximo: AiProvider) => {
    setProvedor(proximo);
    setMensagem(null);
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
            <div className="grid grid-cols-2 gap-2">
              <ProvedorOptionButton
                ativo={provedor === "anthropic"}
                label="Claude"
                onSelect={handleProvedorChange}
                provider="anthropic"
              />
              <ProvedorOptionButton
                ativo={provedor === "gemini"}
                label="Gemini"
                onSelect={handleProvedorChange}
                provider="gemini"
              />
            </div>
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

      <div className="flex flex-col gap-1">
        <Button
          className="justify-start"
          onClick={onConfigurarChave}
          type="button"
          variant="ghost"
        >
          <KeyRoundIcon data-icon="inline-start" />
          Configurar Claude ou Gemini
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

function IndicadorFerramenta({ nome }: { nome: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      <Spinner />
      <span className="animate-pulse">Consultando {nome}...</span>
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
      <Empty className="border-0 bg-transparent">
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
    <Empty className="border-0 bg-transparent">
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
        Configurar Claude ou Gemini
      </Button>
    </Empty>
  );
}

function ConteudoBolhaAi({
  consultando,
  consultandoBase,
  isUltima,
  texto,
}: {
  consultando: boolean;
  consultandoBase: boolean;
  isUltima: boolean;
  texto: string;
}) {
  if (consultando && !texto) {
    return <IndicadorFerramenta nome="buscar_documento_northa" />;
  }

  if (texto) {
    return <ConteudoMensagem content={texto} />;
  }

  if (consultandoBase && isUltima) {
    return <IndicadorFerramenta nome="buscar_documento_northa" />;
  }

  return <span className="text-muted-foreground text-sm">…</span>;
}

function FontesBadges({ fontes }: { fontes: FonteCitada[] }) {
  if (fontes.length === 0) {
    return null;
  }

  return (
    <MessageFooter className="flex flex-wrap gap-1.5">
      {fontes.map((fonte) => (
        <Badge key={fonte.codigo} variant="outline">
          {fonte.codigo} · {fonte.titulo}
        </Badge>
      ))}
    </MessageFooter>
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
  const fontes = fontesDaMensagem(mensagem);
  const consultando = digitando && isUltima && estaConsultandoBase(mensagem);

  return (
    <MessageScrollerItem key={mensagem.id} scrollAnchor={isUltima || digitando}>
      <Message align={isUser ? "end" : "start"}>
        <MessageAvatar>
          <Avatar size="sm">
            <AvatarFallback>
              {isUser ? <UserIcon /> : <BotIcon />}
            </AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <Bubble
            align={isUser ? "end" : "start"}
            variant={isUser ? "default" : "secondary"}
          >
            <BubbleContent>
              <ConteudoBolhaAi
                consultando={consultando}
                consultandoBase={consultandoBase}
                isUltima={isUltima}
                texto={texto}
              />
            </BubbleContent>
          </Bubble>
          <FontesBadges fontes={fontes} />
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
}

function IndicadorDigitando() {
  return (
    <MessageScrollerItem scrollAnchor>
      <Message align="start">
        <MessageAvatar>
          <Avatar size="sm">
            <AvatarFallback>
              <BotIcon />
            </AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <Bubble align="start" variant="secondary">
            <BubbleContent>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Spinner />
                <span className="animate-pulse">conectando à IA...</span>
              </div>
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
}

function deveMostrarIndicadorDigitando({
  consultandoBase,
  digitando,
  ultimaAi,
}: {
  consultandoBase: boolean;
  digitando: boolean;
  ultimaAi: UIMessage | undefined;
}): boolean {
  if (!digitando) {
    return false;
  }

  if (ultimaAi?.role !== "assistant") {
    return true;
  }

  const temTexto = Boolean(textoDaMensagem(ultimaAi));
  return !(temTexto || consultandoBase);
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
    if (error) {
      toast.error(error.message || "Falha na conexão com a IA.");
    }
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
  const mostrarDigitando = deveMostrarIndicadorDigitando({
    consultandoBase,
    digitando,
    ultimaAi,
  });

  return (
    <div className="flex h-svh overflow-hidden bg-[radial-gradient(ellipse_at_top,_#e8eef7_0%,_#f5f7fa_45%,_#eef1f5_100%)]">
      <ApiKeyDialog
        onOpenChange={setDialogChaveAberto}
        onSaved={sincronizarFonteChave}
        open={dialogChaveAberto}
      />

      <aside className="hidden w-80 shrink-0 border-border/80 border-r bg-sidebar/90 p-4 backdrop-blur md:flex md:flex-col">
        <SidebarContent
          fonteChave={fonteChave}
          onConfigurarChave={abrirConfiguracaoChave}
          onPerguntaRapida={handlePerguntaRapida}
          provedor={provedor}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-border/80 border-b bg-background/80 px-4 py-3 backdrop-blur">
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
          </div>
        </header>

        <MessageScrollerProvider>
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-4 px-4 py-6">
                {mostrarEmpty ? (
                  <EmptyState
                    iaAtiva={iaAtiva}
                    onConfigurarChave={abrirConfiguracaoChave}
                  />
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

                {mostrarDigitando ? <IndicadorDigitando /> : null}

                {error && iaAtiva ? (
                  <p className="text-destructive text-sm">
                    Erro na IA: {error.message}
                  </p>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <footer className="border-border/80 border-t bg-background/90 p-4 backdrop-blur">
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
