import type { UIMessage } from "@tanstack/ai-react";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/attachment";
import { CheckIcon, FileTextIcon } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { documentos as baseDocumentos } from "../lib/knowledge-base";
import { DialogDocumento, type DocumentoVisualizado } from "./dialog-documento";

/**
 * Ritmo deliberado: evita flash “tudo de uma vez”.
 * Pensando fica no mínimo um beat; cada arquivo tem tempo de leitura.
 */
const MIN_PENSANDO_MS = 1100;
const INTERVALO_LEITURA_MS = 1150;
const PAUSA_APOS_ULTIMO_MS = 520;
const ALTURA_ITEM_ANEXO_PX = 52;

export type DocumentoLido = DocumentoVisualizado;

type FaseAtividade = "pensando" | "lendo" | "pronto";

function conteudoDaBase(codigo: string): string {
  return baseDocumentos.find((doc) => doc.codigo === codigo)?.conteudo ?? "";
}

/** Extrai documentos retornados pela tool MCP `buscar_documento_northa`. */
export function documentosLidosDaMensagem(message: UIMessage): DocumentoLido[] {
  const lidos: DocumentoLido[] = [];
  const vistos = new Set<string>();

  for (const part of message.parts) {
    if (part.type !== "tool-call" || part.name !== "buscar_documento_northa") {
      continue;
    }

    const output = part.output as
      | {
          documentos?: Array<{
            categoria?: string;
            codigo?: string;
            conteudo?: string;
            titulo?: string;
          }>;
        }
      | undefined;

    for (const doc of output?.documentos ?? []) {
      if (!(doc.codigo && doc.titulo) || vistos.has(doc.codigo)) {
        continue;
      }
      vistos.add(doc.codigo);
      lidos.push({
        categoria: doc.categoria ?? "—",
        codigo: doc.codigo,
        conteudo: doc.conteudo?.trim() || conteudoDaBase(doc.codigo),
        titulo: doc.titulo,
      });
    }
  }

  return lidos;
}

function chaveDocumentos(docs: DocumentoLido[]): string {
  return docs.map((doc) => doc.codigo).join("|");
}

function descricaoAnexo(
  lendo: boolean,
  naFila: boolean,
  documento: DocumentoLido
): string {
  if (lendo) {
    return "Lendo documento via MCP…";
  }
  if (naFila) {
    return "Na fila…";
  }
  return `${documento.titulo} · ${documento.categoria}`;
}

function AnexoDocumentoMcp({
  documento,
  lendo,
  naFila,
  onAbrir,
}: {
  documento: DocumentoLido;
  lendo: boolean;
  naFila: boolean;
  onAbrir: (documento: DocumentoLido) => void;
}) {
  const handleAbrir = useEffectEvent(() => {
    onAbrir(documento);
  });

  let state: "idle" | "processing" | "done" = "done";
  if (naFila) {
    state = "idle";
  } else if (lendo) {
    state = "processing";
  }

  return (
    <Attachment
      className="w-full transition-[opacity,border-color] duration-300 ease-out data-[state=idle]:opacity-55"
      size="sm"
      state={state}
    >
      <AttachmentMedia>
        {lendo || naFila ? <FileTextIcon /> : <CheckIcon />}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{documento.codigo}.md</AttachmentTitle>
        <AttachmentDescription>
          {descricaoAnexo(lendo, naFila, documento)}
        </AttachmentDescription>
      </AttachmentContent>
      {lendo || naFila ? null : (
        <AttachmentTrigger
          aria-label={`Abrir documento ${documento.codigo}`}
          onClick={handleAbrir}
        />
      )}
    </Attachment>
  );
}

/**
 * Fluxo: Pensando (shimmer) → anexos MCP com ritmo → pronto.
 * Altura reservada quando a lista existe evita saltos no MessageScroller.
 */
export function AtividadeMcp({
  animar,
  consultando,
  documentos,
  onLeituraCompleta,
}: {
  animar: boolean;
  consultando: boolean;
  documentos: DocumentoLido[];
  onLeituraCompleta: (completa: boolean) => void;
}) {
  const chave = chaveDocumentos(documentos);
  const totalDocumentos = documentos.length;
  const inicioPensandoRef = useRef<number | null>(null);
  const [fase, setFase] = useState<FaseAtividade>(
    animar ? "pensando" : "pronto"
  );
  const [indiceLendo, setIndiceLendo] = useState(-1);
  const [documentoAberto, setDocumentoAberto] = useState<DocumentoLido | null>(
    null
  );

  const notificarLeitura = useEffectEvent((completa: boolean) => {
    onLeituraCompleta(completa);
  });

  const handleAbrirDocumento = useEffectEvent((documento: DocumentoLido) => {
    setDocumentoAberto(documento);
  });

  const handleDialogOpenChange = useEffectEvent((open: boolean) => {
    if (!open) {
      setDocumentoAberto(null);
    }
  });

  useEffect(() => {
    if (!animar) {
      inicioPensandoRef.current = null;
      setFase("pronto");
      setIndiceLendo(-1);
      notificarLeitura(true);
      return;
    }

    if (inicioPensandoRef.current === null) {
      inicioPensandoRef.current = Date.now();
    }

    setFase("pensando");
    setIndiceLendo(-1);
    notificarLeitura(false);

    if (totalDocumentos === 0 || chave === "") {
      return;
    }

    let cancelado = false;
    let timer: ReturnType<typeof setTimeout>;
    let indice = 0;

    const iniciarLeitura = () => {
      if (cancelado) {
        return;
      }

      setFase("lendo");
      setIndiceLendo(0);

      const avancar = () => {
        if (cancelado) {
          return;
        }

        indice += 1;

        if (indice < totalDocumentos) {
          setIndiceLendo(indice);
          timer = setTimeout(avancar, INTERVALO_LEITURA_MS);
          return;
        }

        setIndiceLendo(-1);
        setFase("pronto");
        timer = setTimeout(() => {
          if (!cancelado) {
            notificarLeitura(true);
          }
        }, PAUSA_APOS_ULTIMO_MS);
      };

      timer = setTimeout(avancar, INTERVALO_LEITURA_MS);
    };

    const decorrido = Date.now() - (inicioPensandoRef.current ?? Date.now());
    const esperaPensando = Math.max(0, MIN_PENSANDO_MS - decorrido);
    timer = setTimeout(iniciarLeitura, esperaPensando);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [animar, chave, totalDocumentos]);

  const mostrandoPensando = animar && fase === "pensando";
  const mostrandoAnexos =
    documentos.length > 0 && (!animar || fase === "lendo" || fase === "pronto");

  const alturaReservada =
    mostrandoAnexos && documentos.length > 0
      ? documentos.length * ALTURA_ITEM_ANEXO_PX +
        Math.max(0, documentos.length - 1) * 8
      : undefined;

  return (
    <>
      <div
        className="flex w-full max-w-md flex-col gap-2"
        style={
          alturaReservada
            ? { minHeight: alturaReservada }
            : { minHeight: mostrandoPensando ? 28 : undefined }
        }
      >
        {mostrandoPensando ? (
          <span
            className="chat-status-enter shimmer w-fit text-muted-foreground text-sm"
            role="status"
          >
            {consultando ? "Consultando a base…" : "Pensando…"}
          </span>
        ) : null}

        {mostrandoAnexos
          ? documentos.map((doc, index) => {
              const lendo = animar && fase === "lendo" && index === indiceLendo;
              const naFila =
                animar &&
                fase === "lendo" &&
                indiceLendo !== -1 &&
                index > indiceLendo;

              return (
                <div
                  className="chat-attach-enter"
                  key={doc.codigo}
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <AnexoDocumentoMcp
                    documento={doc}
                    lendo={lendo}
                    naFila={naFila}
                    onAbrir={handleAbrirDocumento}
                  />
                </div>
              );
            })
          : null}
      </div>

      <DialogDocumento
        documento={documentoAberto}
        onOpenChange={handleDialogOpenChange}
        open={documentoAberto !== null}
      />
    </>
  );
}
