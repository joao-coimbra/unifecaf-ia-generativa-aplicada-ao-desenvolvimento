import type { UIMessage } from "@tanstack/ai-react";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/attachment";
import { CheckIcon, FileSearchIcon, FileTextIcon } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";

import { documentos as baseDocumentos } from "../lib/knowledge-base";
import { DialogDocumento, type DocumentoVisualizado } from "./dialog-documento";

/** Intervalo só troca estado (processing→done), sem montar/desmontar — evita jank no scroller. */
const INTERVALO_ESTADO_MS = 420;
const PAUSA_APOS_ULTIMO_MS = 220;

export type DocumentoLido = DocumentoVisualizado;

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

function AnexoDocumentoMcp({
  documento,
  lendo,
  onAbrir,
}: {
  documento: DocumentoLido;
  lendo: boolean;
  onAbrir: (documento: DocumentoLido) => void;
}) {
  const handleAbrir = useEffectEvent(() => {
    onAbrir(documento);
  });

  return (
    <Attachment
      className="w-full"
      size="sm"
      state={lendo ? "processing" : "done"}
    >
      <AttachmentMedia>
        {lendo ? <FileTextIcon /> : <CheckIcon />}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{documento.codigo}.md</AttachmentTitle>
        <AttachmentDescription>
          {lendo
            ? "Lendo documento via MCP…"
            : `${documento.titulo} · ${documento.categoria}`}
        </AttachmentDescription>
      </AttachmentContent>
      {lendo ? null : (
        <AttachmentTrigger
          aria-label={`Abrir documento ${documento.codigo}`}
          onClick={handleAbrir}
        />
      )}
    </Attachment>
  );
}

/**
 * Fluxo: Pensando → lista estável de anexos MCP (só muda state) → pronto.
 * Todos os docs montam de uma vez para não alterar a altura a cada tick.
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
    const totalParaChave = chave === "" ? 0 : totalDocumentos;

    if (!animar) {
      setIndiceLendo(-1);
      notificarLeitura(true);
      return;
    }

    if (totalParaChave === 0) {
      setIndiceLendo(-1);
      notificarLeitura(false);
      return;
    }

    setIndiceLendo(0);
    notificarLeitura(false);

    let cancelado = false;
    let indice = 0;
    let timer: ReturnType<typeof setTimeout>;

    const avancar = () => {
      if (cancelado) {
        return;
      }

      indice += 1;

      if (indice < totalParaChave) {
        setIndiceLendo(indice);
        timer = setTimeout(avancar, INTERVALO_ESTADO_MS);
        return;
      }

      setIndiceLendo(-1);
      timer = setTimeout(() => {
        if (!cancelado) {
          notificarLeitura(true);
        }
      }, PAUSA_APOS_ULTIMO_MS);
    };

    timer = setTimeout(avancar, INTERVALO_ESTADO_MS);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [animar, chave, totalDocumentos]);

  const mostrandoBusca = animar && documentos.length === 0;

  return (
    <>
      <div className="flex w-full max-w-md flex-col gap-2">
        {mostrandoBusca ? (
          <Attachment className="w-full" size="sm" state="processing">
            <AttachmentMedia>
              <FileSearchIcon />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>
                {consultando ? "Consultando a base…" : "Pensando…"}
              </AttachmentTitle>
              <AttachmentDescription>
                {consultando
                  ? "MCP · buscar_documento_northa"
                  : "Preparando consulta à base Northa"}
              </AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        ) : null}

        {documentos.map((doc, index) => {
          const aindaNaoLeu =
            animar && indiceLendo !== -1 && index > indiceLendo;
          const lendo = animar && index === indiceLendo;

          if (aindaNaoLeu) {
            return (
              <Attachment
                className="w-full opacity-50"
                key={doc.codigo}
                size="sm"
                state="idle"
              >
                <AttachmentMedia>
                  <FileTextIcon />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{doc.codigo}.md</AttachmentTitle>
                  <AttachmentDescription>Na fila…</AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            );
          }

          return (
            <AnexoDocumentoMcp
              documento={doc}
              key={doc.codigo}
              lendo={lendo}
              onAbrir={handleAbrirDocumento}
            />
          );
        })}
      </div>

      <DialogDocumento
        documento={documentoAberto}
        onOpenChange={handleDialogOpenChange}
        open={documentoAberto !== null}
      />
    </>
  );
}
