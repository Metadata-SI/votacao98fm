/*
 * Contrato mínimo de req/res que as funções em api/ usam. A Vercel entrega
 * objetos compatíveis com isso em runtime, e o plugin de dev do Vite
 * (ver vite.config.ts) monta o mesmo formato com um shim.
 */

export interface ApiRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  statusCode?: number;
  setHeader(nome: string, valor: string): void;
  status(codigo: number): ApiResponse;
  json(corpo: unknown): void;
  end(corpo?: string): void;
}
