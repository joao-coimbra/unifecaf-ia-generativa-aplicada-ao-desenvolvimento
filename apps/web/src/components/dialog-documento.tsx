import { Badge } from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/dialog";
import { ScrollArea } from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/scroll-area";

import { MarkdownDocumento } from "./markdown-documento";

export interface DocumentoVisualizado {
  categoria: string;
  codigo: string;
  conteudo: string;
  titulo: string;
}

export function DialogDocumento({
  documento,
  open,
  onOpenChange,
}: {
  documento: DocumentoVisualizado | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8">
            {documento
              ? `${documento.codigo} · ${documento.titulo}`
              : "Documento"}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            {documento ? (
              <>
                <Badge variant="outline">{documento.categoria}</Badge>
                <span>Documento completo da base Northa</span>
              </>
            ) : (
              "Conteúdo indisponível"
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 pr-3">
          <article className="pb-4">
            {documento ? (
              <MarkdownDocumento content={documento.conteudo} />
            ) : (
              <p className="text-muted-foreground text-sm">
                Documento sem conteúdo.
              </p>
            )}
          </article>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
