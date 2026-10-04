// Tipos compartilhados entre a função serverless (api/resultado.ts) e o front-end (src/lib/coleta.ts).

export interface RespostaColeta {
  opcao: string;
  quantidade: number;
  percentual: number;
}

export interface PerguntaColeta {
  numero: number;
  tipo: string | null; // "Estimulada" | "Espontânea" | null
  texto: string;
  respostas: RespostaColeta[];
}

export interface ResultadoPayload {
  titulo: string;
  atualizadoEm: string | null; // string bruta vinda da origem, ex: "21/09/2026 07:11:51"
  buscadoEm: string; // ISO timestamp de quando o proxy buscou os dados
  totalEntrevistas: number;
  perguntas: PerguntaColeta[];
}

export interface ResultadoErro {
  erro: string;
}
