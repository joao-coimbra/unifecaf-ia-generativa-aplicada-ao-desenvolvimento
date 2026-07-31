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

import { gerarResposta } from "../lib/ai";
import {
  type ApiKeySource,
  clearStoredApiKey,
  getApiKeySource,
  getStoredApiKey,
  setStoredApiKey,
} from "../lib/api-key";
import {
  type Categoria,
  categorias,
  type Documento,
} from "../lib/knowledge-base";
import { buscarDocumentos } from "../lib/search";

interface Mensagem {
  content: string;
  fontes?: Documento[];
  id: string;
  role: "user" | "assistant";
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

function criarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function rotuloFonte(fonte: ApiKeySource): string {
  if (fonte === "local") {
    return "IA conectada (sua chave)";
  }
  if (fonte === "env") {
    return "IA conectada (ambiente)";
  }
  return "Modo offline";
}

function rotuloBadge(fonte: ApiKeySource): string {
  if (fonte === "local") {
    return "Sua chave ativa";
  }
  if (fonte === "env") {
    return "Anthropic ativa";
  }
  return "Sem chave de API";
}

function PerguntaRapidaButton({
  pergunta,
  onSelect,
}: {
  pergunta: string;
  onSelect: (pergunta: string) => void;
}) {
  const handleClick = useEffectEvent(() => {
    onSelect(pergunta);
  });

  return (
    <Button
      className="h-auto justify-start whitespace-normal px-3 py-2 text-left"
      onClick={handleClick}
      type="button"
      variant="outline"
    >
      {pergunta}
    </Button>
  );
}

function ApiKeyDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRascunho(getStoredApiKey() ?? "");
      setMensagem(null);
    }
  }, [open]);

  const handleSalvar = useEffectEvent((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valor = rascunho.trim();
    if (!valor) {
      setMensagem("Cole uma chave válida da Anthropic.");
      return;
    }

    setStoredApiKey(valor);
    setMensagem("Chave salva neste navegador.");
    onSaved();
    setOpen(false);
  });

  const handleRemover = useEffectEvent(() => {
    clearStoredApiKey();
    setRascunho("");
    setMensagem("Chave removida.");
    onSaved();
  });

  const handleRascunhoChange = useEffectEvent(
    (event: ChangeEvent<HTMLInputElement>) => {
      setRascunho(event.target.value);
      setMensagem(null);
    }
  );

  const handleOpenChange = useEffectEvent((proximo: boolean) => {
    setOpen(proximo);
  });

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger
        render={<Button className="justify-start" variant="ghost" />}
      >
        <KeyRoundIcon data-icon="inline-start" />
        Configurar chave da API
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chave da API Anthropic</DialogTitle>
          <DialogDescription>
            Cole sua própria chave para ativar respostas com IA. Ela fica salva
            apenas neste navegador (localStorage) e é enviada direto à
            Anthropic.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-3" onSubmit={handleSalvar}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="anthropic-api-key">Chave da API</Label>
            <Input
              autoComplete="off"
              id="anthropic-api-key"
              onChange={handleRascunhoChange}
              placeholder="sk-ant-..."
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
                  href="https://console.anthropic.com/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  console.anthropic.com
                </a>
                .
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button onClick={handleRemover} type="button" variant="outline">
              Remover chave
            </Button>
            <Button type="submit">Salvar chave</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SidebarContent({
  fonteChave,
  onPerguntaRapida,
  onChaveAlterada,
}: {
  fonteChave: ApiKeySource;
  onPerguntaRapida: (pergunta: string) => void;
  onChaveAlterada: () => void;
}) {
  const iaAtiva = fonteChave !== "none";

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-none bg-primary text-primary-foreground">
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
          {rotuloFonte(fonteChave)}
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
                key={pergunta}
                onSelect={onPerguntaRapida}
                pergunta={pergunta}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex flex-col gap-1">
        <ApiKeyDialog onSaved={onChaveAlterada} />

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
                Desenvolvimento (UniFECAF). Demonstra um assistente corporativo
                que consulta uma base de conhecimento interna (RH, TI, Operações
                e Compliance) e responde em linguagem natural com suporte da API
                Anthropic. Use o botão acima para colar sua chave da API. A
                empresa Northa Soluções Logísticas é fictícia.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

const BOLD_MARKDOWN_REGEX = /\*\*(.*?)\*\*/g;

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

export function CopilotoNortha() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [entrada, setEntrada] = useState("");
  const [digitando, setDigitando] = useState(false);
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [fonteChave, setFonteChave] = useState<ApiKeySource>("none");
  const inputRef = useRef<HTMLInputElement>(null);
  const digitandoRef = useRef(digitando);
  const entradaRef = useRef(entrada);

  digitandoRef.current = digitando;
  entradaRef.current = entrada;

  useEffect(() => {
    setFonteChave(getApiKeySource());
  }, []);

  useEffect(() => {
    if (!digitando) {
      inputRef.current?.focus();
    }
  }, [digitando]);

  const sincronizarFonteChave = useEffectEvent(() => {
    setFonteChave(getApiKeySource());
  });

  const enviarPergunta = useEffectEvent(async (perguntaBruta: string) => {
    const pergunta = perguntaBruta.trim();
    if (!pergunta || digitandoRef.current) {
      return;
    }

    const mensagemUsuario: Mensagem = {
      content: pergunta,
      id: criarId(),
      role: "user",
    };

    setMensagens((atual) => [...atual, mensagemUsuario]);
    setEntrada("");
    setDigitando(true);
    setSidebarAberta(false);

    const docs = buscarDocumentos(pergunta);
    const resposta = await gerarResposta(pergunta, docs);

    const mensagemAssistente: Mensagem = {
      content: resposta,
      fontes: docs,
      id: criarId(),
      role: "assistant",
    };

    setMensagens((atual) => [...atual, mensagemAssistente]);
    setDigitando(false);
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

  const iaAtiva = fonteChave !== "none";

  return (
    <div className="flex h-svh overflow-hidden bg-[radial-gradient(ellipse_at_top,_#e8eef7_0%,_#f5f7fa_45%,_#eef1f5_100%)]">
      <aside className="hidden w-80 shrink-0 border-border/80 border-r bg-sidebar/90 p-4 backdrop-blur md:flex md:flex-col">
        <SidebarContent
          fonteChave={fonteChave}
          onChaveAlterada={sincronizarFonteChave}
          onPerguntaRapida={handlePerguntaRapida}
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
                  onChaveAlterada={sincronizarFonteChave}
                  onPerguntaRapida={handlePerguntaRapida}
                />
              </SheetContent>
            </Sheet>

            <div>
              <h1 className="font-semibold text-sm tracking-tight md:text-base">
                Copiloto Northa
              </h1>
              <p className="text-muted-foreground text-xs">
                Assistente corporativo inteligente
              </p>
            </div>
          </div>

          <Badge variant={iaAtiva ? "default" : "outline"}>
            {rotuloBadge(fonteChave)}
          </Badge>
        </header>

        <MessageScrollerProvider>
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-4 px-4 py-6">
                {mensagens.length === 0 && !digitando ? (
                  <Empty className="border-0 bg-transparent">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <BotIcon />
                      </EmptyMedia>
                      <EmptyTitle>Como posso ajudar?</EmptyTitle>
                      <EmptyDescription>
                        Pergunte sobre políticas de RH, TI, Operações ou
                        Compliance da Northa. Na barra lateral, use{" "}
                        <strong>Configurar chave da API</strong> para colar sua
                        chave Anthropic — ou use o modo offline.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : null}

                {mensagens.map((mensagem, index) => {
                  const isUser = mensagem.role === "user";
                  const isLast = index === mensagens.length - 1 && !digitando;

                  return (
                    <MessageScrollerItem
                      key={mensagem.id}
                      scrollAnchor={isLast}
                    >
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
                              <ConteudoMensagem content={mensagem.content} />
                            </BubbleContent>
                          </Bubble>
                          {mensagem.fontes && mensagem.fontes.length > 0 ? (
                            <MessageFooter className="flex flex-wrap gap-1.5">
                              {mensagem.fontes.map((fonte) => (
                                <Badge key={fonte.codigo} variant="outline">
                                  {fonte.codigo} · {fonte.titulo}
                                </Badge>
                              ))}
                            </MessageFooter>
                          ) : null}
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  );
                })}

                {digitando ? (
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
                              <span className="animate-pulse">
                                digitando...
                              </span>
                            </div>
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
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
                disabled={digitando}
                onChange={handleEntradaChange}
                placeholder="Pergunte algo sobre as políticas da Northa..."
                ref={inputRef}
                value={entrada}
              />
              <InputGroupAddon align="inline-end">
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
              </InputGroupAddon>
            </InputGroup>
          </form>
        </footer>
      </div>
    </div>
  );
}
