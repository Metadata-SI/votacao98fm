// Tipos compartilhados entre as funções serverless (api/*.ts) e o front-end (src/lib/enquete.ts).

/** Slugs usados em rotas, no embed e como chave de armazenamento dos votos. */
export type CargoSlug =
  | 'presidente'
  | 'governador'
  | 'senador'
  | 'deputado-federal'
  | 'deputado-estadual';

export const CARGO_SLUGS: CargoSlug[] = [
  'presidente',
  'governador',
  'senador',
  'deputado-federal',
  'deputado-estadual',
];

/** Vice (cargo majoritário) ou 1º/2º suplente (Senado), conforme vem do TSE. */
export interface VinculadoCandidato {
  tipo: string | null; // "v" = vice | "s1"/"s2" = suplentes
  nome: string;
  partido: string;
}

export interface Candidato {
  id: string; // sqcand do TSE — identificador estável
  numero: string;
  nome: string; // nome de urna
  nomeCompleto: string | null;
  partido: string;
  partidoNome: string;
  coligacao: string | null;
  situacao: string | null;
  eleito: boolean;
  foto: string;
  vices: VinculadoCandidato[];
}

export interface CargoCandidatos {
  cargo: CargoSlug;
  codigoCargo: string;
  nome: string; // "Senador", "Deputado Federal"...
  vagas: number; // nv do TSE — 2 no caso do Senado no RN
  abrangencia: string; // "br" | "rn"
  codigoEleicao: string;
  atualizadoEm: string | null;
  candidatos: Candidato[];
}

export interface CandidatosPayload {
  geradoEm: string; // ISO — quando este payload foi montado
  origem: 'tse' | 'snapshot'; // de onde vieram os dados
  cargos: Record<string, CargoCandidatos>;
}

/* ---------------------------------- Votos --------------------------------- */

/** Uma escolha do eleitor. `posicao` só é usada no Senado (1 = 1º voto, 2 = 2º voto). */
export interface EscolhaVoto {
  candidatoId: string;
  posicao: number;
}

export interface VotoRequest {
  cargo: CargoSlug;
  escolhas: EscolhaVoto[];
  eleitorId: string;
}

export interface ResultadoCandidato {
  candidatoId: string;
  votos: number;
  percentual: number;
  /** Quebra por posição — presente apenas no Senado. */
  porPosicao?: Record<number, number>;
}

export interface ResultadoEnquete {
  cargo: CargoSlug;
  totalVotos: number; // total de escolhas registradas
  totalParticipantes: number; // nº de eleitores distintos
  resultados: ResultadoCandidato[];
  atualizadoEm: string; // ISO
  persistencia: 'supabase' | 'memoria';
}

export interface ErroPayload {
  erro: string;
}
