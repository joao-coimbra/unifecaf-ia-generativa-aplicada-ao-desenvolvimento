import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/sonner";
import { TooltipProvider } from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/tooltip";

import { ThemeProvider } from "../components/theme-provider";
import appCss from "../index.css?url";

export type RouterAppContext = Record<string, never>;

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootDocument,
  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
    ],
    meta: [
      {
        charSet: "utf-8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        title: "Copiloto Northa — Assistente Corporativo",
      },
      {
        content:
          "Assistente corporativo inteligente da Northa Soluções Logísticas. Consulte políticas de RH, TI, Operações e Compliance em linguagem natural.",
        name: "description",
      },
    ],
  }),
});

function RootDocument() {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-svh bg-background text-foreground antialiased">
        <ThemeProvider>
          <TooltipProvider>
            <Outlet />
            <Toaster richColors />
            <TanStackRouterDevtools position="bottom-left" />
          </TooltipProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
