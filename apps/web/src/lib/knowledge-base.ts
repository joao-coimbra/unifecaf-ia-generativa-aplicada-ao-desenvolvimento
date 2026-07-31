export type Categoria = "RH" | "TI" | "Operações" | "Compliance";

export interface Documento {
  categoria: Categoria;
  codigo: string;
  conteudo: string;
  titulo: string;
}

const CATEGORIAS_VALIDAS = new Set<string>([
  "RH",
  "TI",
  "Operações",
  "Compliance",
]);

const FRONT_MATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const LINE_SPLIT_REGEX = /\r?\n/;
const MARKDOWN_EXT_REGEX = /\.md$/;

const arquivos = import.meta.glob("../data/documentos-northa/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

function lerCampo(
  meta: Record<string, string>,
  chave: string
): string | undefined {
  return Object.hasOwn(meta, chave) ? meta[chave] : undefined;
}

function parseFrontMatter(raw: string): {
  meta: Record<string, string>;
  conteudo: string;
} {
  const match = FRONT_MATTER_REGEX.exec(raw);

  if (!match) {
    return { conteudo: raw.trim(), meta: {} };
  }

  const [, frontMatter, body] = match;
  const meta: Record<string, string> = {};

  for (const line of frontMatter.split(LINE_SPLIT_REGEX)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) {
      meta[key] = value;
    }
  }

  return { conteudo: body.trim(), meta };
}

function toCategoria(value: string | undefined): Categoria {
  if (value && CATEGORIAS_VALIDAS.has(value)) {
    return value as Categoria;
  }

  return "RH";
}

function parseDocumento(raw: string, path: string): Documento {
  const { meta, conteudo } = parseFrontMatter(raw);
  const fileName =
    path.split("/").at(-1)?.replace(MARKDOWN_EXT_REGEX, "") ?? "DOC";

  return {
    categoria: toCategoria(lerCampo(meta, "categoria")),
    codigo: lerCampo(meta, "codigo") ?? fileName,
    conteudo,
    titulo: lerCampo(meta, "titulo") ?? fileName,
  };
}

export const documentos: Documento[] = Object.entries(arquivos)
  .map(([path, raw]) => parseDocumento(raw, path))
  .toSorted((a, b) => a.codigo.localeCompare(b.codigo));

export const categorias: Categoria[] = ["RH", "TI", "Operações", "Compliance"];
