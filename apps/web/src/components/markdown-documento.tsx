import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  a: ({ children, href }) => (
    <a
      className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-border border-l-2 pl-4 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
        {children}
      </code>
    );
  },
  h1: ({ children }) => (
    <h1 className="font-semibold text-foreground text-xl tracking-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-semibold text-foreground text-lg tracking-tight">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-medium text-base text-foreground tracking-tight">
      {children}
    </h3>
  ),
  hr: () => <hr className="border-border" />,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 text-foreground marker:text-muted-foreground [&_li+li]:mt-1">
      {children}
    </ol>
  ),
  p: ({ children }) => (
    <p className="text-foreground/90 leading-relaxed">{children}</p>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-3 font-mono text-foreground text-xs leading-relaxed">
      {children}
    </pre>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  td: ({ children }) => (
    <td className="border-border border-t px-3 py-2 text-foreground/90">
      {children}
    </td>
  ),
  th: ({ children }) => (
    <th className="bg-muted/60 px-3 py-2 font-medium text-foreground">
      {children}
    </th>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tr: ({ children }) => <tr>{children}</tr>,
  ul: ({ children }) => (
    <ul className="list-disc pl-5 text-foreground marker:text-muted-foreground [&_li+li]:mt-1">
      {children}
    </ul>
  ),
};

/** Renderiza Markdown da base Northa como rich text React (não fonte bruta). */
export function MarkdownDocumento({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <p className="text-muted-foreground text-sm">Documento sem conteúdo.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
