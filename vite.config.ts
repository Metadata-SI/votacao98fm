import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import type { IncomingMessage, ServerResponse } from "http";
import path from "path";
import { componentTagger } from "lovable-tagger";

/*
 * Serve as funções de api/ dentro do `vite dev`, imitando o contrato mínimo que
 * a Vercel oferece (req.query, req.body, res.status().json()). Assim o painel e
 * as enquetes rodam localmente sem precisar do `vercel dev`.
 */
const ROTAS_API = ["resultado", "candidatos", "votos"] as const;

type ReqDev = IncomingMessage & { query?: Record<string, string>; body?: unknown };
type ResDev = ServerResponse & {
  status?: (codigo: number) => ResDev;
  json?: (corpo: unknown) => ResDev;
};

function lerCorpo(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let bruto = "";
    req.on("data", (pedaco: Buffer) => {
      bruto += pedaco;
    });
    req.on("end", () => resolve(bruto));
    req.on("error", reject);
  });
}

function apiDevPlugin(): Plugin {
  return {
    name: "api-dev",

    /*
     * Os handlers em api/ importam com extensão .js porque é assim que a Vercel
     * resolve ESM em runtime. Em dev os arquivos ainda são .ts, então o caminho
     * é reescrito aqui.
     */
    resolveId(origem, importador) {
      if (!importador || !origem.startsWith(".") || !origem.endsWith(".js")) return null;
      if (!/[\\/]api[\\/]/.test(importador)) return null;

      const alvo = path.resolve(path.dirname(importador), origem.replace(/\.js$/, ".ts"));
      return fs.existsSync(alvo) ? alvo : null;
    },

    configureServer(server) {
      for (const rota of ROTAS_API) {
        server.middlewares.use(`/api/${rota}`, async (req: ReqDev, res: ResDev) => {
          try {
            const modulo = await server.ssrLoadModule(`/api/${rota}.ts`);
            const handler = modulo.default;

            const url = new URL(req.url ?? "/", "http://localhost");
            req.query = Object.fromEntries(url.searchParams.entries());

            if (req.method !== "GET" && req.method !== "HEAD") {
              const bruto = await lerCorpo(req);
              try {
                req.body = bruto ? JSON.parse(bruto) : {};
              } catch {
                req.body = {};
              }
            }

            // Shim do res no formato que os handlers esperam.
            res.status = (codigo: number) => {
              res.statusCode = codigo;
              return res;
            };
            res.json = (corpo: unknown) => {
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify(corpo));
              return res;
            };

            await handler(req, res);
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(
              JSON.stringify({
                erro: err instanceof Error ? err.message : `Erro desconhecido em /api/${rota}.`,
              }),
            );
          }
        });
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  /*
   * As funções em api/ leem configuração de `process.env` (credenciais do
   * Upstash, códigos de eleição do TSE). Em produção quem preenche isso é a
   * Vercel; em dev, o Vite carrega .env apenas para `import.meta.env` do
   * cliente, e só o que tem prefixo VITE_. O prefixo vazio abaixo carrega todas
   * as chaves e as repassa para `process.env`, para que `npm run dev` enxergue
   * o mesmo que a função enxerga publicada.
   */
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      mode === "development" && apiDevPlugin(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
