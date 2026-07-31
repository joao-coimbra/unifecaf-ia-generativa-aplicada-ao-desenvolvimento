import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3001,
  },
  // Bundle SSR deps only for production (Vercel has no node_modules at runtime).
  // Keeping noExternal in `vite dev` breaks CJS packages like React under the SSR runner.
  ...(command === "build"
    ? {
        ssr: {
          noExternal: true as const,
        },
      }
    : {}),
}));
