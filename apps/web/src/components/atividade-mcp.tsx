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

const INTERVALO_LEITURA_MS = 650;
const PAUSA_APOS_ULTIMO_MS = 380;
const ATRASO_PRIMEIRA_LEITURA_MS = 280;

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
 * Fluxo de chatbot: Pensando → lendo anexos MCP (Attachment + shimmer) → pronto.
 * O shimmer oficial do shadcn fica em `AttachmentTitle` com `state="processing"`.
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
  const [visiveis, setVisiveis] = useState(() =>
    animar ? 0 : documentos.length
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
    const totalParaChave = chave === "" ? 0 : totalDocumentos;

    if (!animar) {
      setVisiveis(totalParaChave);
      setIndiceLendo(-1);
      notificarLeitura(true);
      return;
    }

    if (totalParaChave === 0) {
      setVisiveis(0);
      setIndiceLendo(-1);
      notificarLeitura(false);
      return;
    }

    setVisiveis(0);
    setIndiceLendo(-1);
    notificarLeitura(false);

    let cancelado = false;
    let indice = 0;
    let timer: ReturnType<typeof setTimeout>;

    const revelarProximo = () => {
      if (cancelado) {
        return;
      }

      setIndiceLendo(indice);
      setVisiveis(indice + 1);
      indice += 1;

      if (indice < totalParaChave) {
        timer = setTimeout(revelarProximo, INTERVALO_LEITURA_MS);
        return;
      }

      timer = setTimeout(() => {
        if (cancelado) {
          return;
        }
        setIndiceLendo(-1);
        notificarLeitura(true);
      }, PAUSA_APOS_ULTIMO_MS);
    };

    timer = setTimeout(revelarProximo, ATRASO_PRIMEIRA_LEITURA_MS);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [animar, chave, totalDocumentos]);

  const mostrandoBusca = animar && documentos.length === 0;
  const docsVisiveis = documentos.slice(0, visiveis);

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

        {docsVisiveis.map((doc, index) => (
          <AnexoDocumentoMcp
            documento={doc}
            key={doc.codigo}
            lendo={animar && index === indiceLendo}
            onAbrir={handleAbrirDocumento}
          />
        ))}
      </div>

      <DialogDocumento
        documento={documentoAberto}
        onOpenChange={handleDialogOpenChange}
        open={documentoAberto !== null}
      />
    </>
  );
}
