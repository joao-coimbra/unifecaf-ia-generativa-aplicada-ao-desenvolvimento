import { type Documento, documentos } from "./knowledge-base";

const TOKEN_SPLIT_REGEX = /\W+/;
const ACCENT_REGEX = /[\u0300-\u036f]/g;

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(ACCENT_REGEX, "");
}

function tokenizar(pergunta: string): string[] {
  return normalizar(pergunta)
    .split(TOKEN_SPLIT_REGEX)
    .filter((termo) => termo.length > 2);
}

export function buscarDocumentos(pergunta: string, limite = 3): Documento[] {
  const termos = tokenizar(pergunta);

  if (termos.length === 0) {
    return [];
  }

  const pontuados = documentos.map((doc) => {
    const textoBusca = normalizar(
      `${doc.titulo} ${doc.categoria} ${doc.conteudo}`
    );
    const pontuacao = termos.reduce(
      (acc, termo) => acc + (textoBusca.includes(termo) ? 1 : 0),
      0
    );

    return { doc, pontuacao };
  });

  return pontuados
    .filter((item) => item.pontuacao > 0)
    .toSorted((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, limite)
    .map((item) => item.doc);
}
