import type {
  Candidato,
  CandidatosPayload,
  CargoCandidatos,
  CargoSlug,
  EscolhaVoto,
  ResultadoEnquete,
} from '../../shared/enquete-types';

import { ehSegundoTurno } from '../../shared/segundoTurno';

export { CARGO_SLUGS } from '../../shared/enquete-types';
export { corDoCandidato, ehSegundoTurno, finalistasDoCargo } from '../../shared/segundoTurno';
export type { Candidato, CandidatosPayload, CargoCandidatos, CargoSlug, EscolhaVoto, ResultadoEnquete };

/* ------------------------------ meta dos cargos ---------------------------- */

export interface CargoMeta {
  slug: CargoSlug;
  titulo: string;
  /** Pergunta que aparece no topo da enquete incorporada. */
  pergunta: string;
  /** Usada no lugar de `pergunta` quando o cargo está em 2º turno. */
  perguntaSegundoTurno?: string;
  /** Linha de apoio no card do painel. */
  descricao: string;
  abrangencia: string;
  /** Quantos votos o leitor dá. Só o Senado tem 2. */
  votos: number;
  /** Lista longa (deputados) ganha campo de busca em vez de rolagem pura. */
  listaLonga: boolean;
  cor: string; // HSL, alinhado às --candidate-* do index.css
}

export const CARGOS_META: Record<CargoSlug, CargoMeta> = {
  presidente: {
    slug: 'presidente',
    titulo: 'Presidente',
    pergunta: 'Se a eleição para Presidente fosse hoje, em quem você votaria?',
    perguntaSegundoTurno: 'Se o 2º turno para Presidente fosse hoje, em quem você votaria?',
    descricao: 'Candidaturas de abrangência nacional',
    abrangencia: 'Brasil',
    votos: 1,
    listaLonga: false,
    cor: 'hsl(222, 80%, 55%)',
  },
  governador: {
    slug: 'governador',
    titulo: 'Governador',
    pergunta: 'Se a eleição para Governador do RN fosse hoje, em quem você votaria?',
    perguntaSegundoTurno: 'Se o 2º turno para o Governo do RN fosse hoje, em quem você votaria?',
    descricao: 'Candidaturas ao governo do estado',
    abrangencia: 'Rio Grande do Norte',
    votos: 1,
    listaLonga: false,
    cor: 'hsl(150, 45%, 42%)',
  },
  senador: {
    slug: 'senador',
    titulo: 'Senador',
    pergunta: 'O RN elege dois senadores. Em quem você votaria?',
    descricao: 'Duas vagas — o leitor escolhe 1º e 2º voto',
    abrangencia: 'Rio Grande do Norte',
    votos: 2,
    listaLonga: false,
    cor: 'hsl(15, 75%, 55%)',
  },
  'deputado-federal': {
    slug: 'deputado-federal',
    titulo: 'Deputado Federal',
    pergunta: 'Se a eleição para Deputado Federal fosse hoje, em quem você votaria?',
    descricao: 'Candidaturas à Câmara dos Deputados pelo RN',
    abrangencia: 'Rio Grande do Norte',
    votos: 1,
    listaLonga: true,
    cor: 'hsl(280, 45%, 55%)',
  },
  'deputado-estadual': {
    slug: 'deputado-estadual',
    titulo: 'Deputado Estadual',
    pergunta: 'Se a eleição para Deputado Estadual fosse hoje, em quem você votaria?',
    descricao: 'Candidaturas à Assembleia Legislativa do RN',
    abrangencia: 'Rio Grande do Norte',
    votos: 1,
    listaLonga: true,
    cor: 'hsl(35, 85%, 52%)',
  },
};

/*
 * Cargos que o painel exibe, na ordem dos cards.
 *
 * Tirar um cargo daqui só o esconde do painel: a rota /enquete/<cargo> e a API
 * continuam respondendo, de modo que enquete já incorporada numa matéria antiga
 * segue funcionando. Para desligar um cargo de verdade, é preciso removê-lo
 * também de CARGO_SLUGS em shared/enquete-types.ts.
 */
export const CARGOS_NO_PAINEL: CargoSlug[] = ['presidente', 'governador'];

export function metaDoCargo(slug: string | undefined): CargoMeta | null {
  if (!slug) return null;
  return CARGOS_META[slug as CargoSlug] ?? null;
}

/** Pergunta do topo da enquete, já considerando se o cargo está em 2º turno. */
export function perguntaDoCargo(meta: CargoMeta): string {
  if (ehSegundoTurno(meta.slug) && meta.perguntaSegundoTurno) return meta.perguntaSegundoTurno;
  return meta.pergunta;
}

/** Linha de apoio do card — em 2º turno, diz isso em vez da abrangência. */
export function descricaoDoCargo(meta: CargoMeta): string {
  return ehSegundoTurno(meta.slug) ? '2º turno — apenas as duas candidaturas na disputa' : meta.descricao;
}

/** Rótulo de cada posição de voto. Só o Senado usa a forma ordinal. */
export function rotuloPosicao(posicao: number, totalVotos: number): string {
  if (totalVotos <= 1) return 'Seu voto';
  return posicao === 1 ? '1º voto' : '2º voto';
}

/* ------------------------------ cliente da API ----------------------------- */

export async function buscarCandidatos(cargo?: CargoSlug): Promise<CandidatosPayload> {
  const url = cargo ? `/api/candidatos?cargo=${cargo}` : '/api/candidatos';
  const res = await fetch(url);
  const dados = await res.json();
  if (!res.ok) throw new Error(dados?.erro || `HTTP ${res.status}`);
  return dados as CandidatosPayload;
}

export async function buscarResultadoEnquete(cargo: CargoSlug): Promise<ResultadoEnquete> {
  const res = await fetch(`/api/votos?cargo=${cargo}`, { cache: 'no-store' });
  const dados = await res.json();
  if (!res.ok) throw new Error(dados?.erro || `HTTP ${res.status}`);
  return dados as ResultadoEnquete;
}

export class JaVotouError extends Error {}

export async function enviarVoto(
  cargo: CargoSlug,
  escolhas: EscolhaVoto[],
  eleitorId: string,
): Promise<ResultadoEnquete> {
  const res = await fetch('/api/votos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cargo, escolhas, eleitorId }),
  });
  const dados = await res.json();
  if (res.status === 409) throw new JaVotouError(dados?.erro || 'Este dispositivo já votou.');
  if (!res.ok) throw new Error(dados?.erro || `HTTP ${res.status}`);
  return dados as ResultadoEnquete;
}

/* ------------------------------- id do eleitor ----------------------------- */

const ELEITOR_KEY = '98fm-enquete:eleitor';

/**
 * Identificador anônimo por navegador, usado só para evitar que o mesmo leitor
 * vote várias vezes. Não identifica a pessoa e não sai do dispositivo a não ser
 * dentro do próprio POST do voto.
 */
export function obterEleitorId(): string {
  try {
    const salvo = localStorage.getItem(ELEITOR_KEY);
    if (salvo) return salvo;
    const novo =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(ELEITOR_KEY, novo);
    return novo;
  } catch {
    // Navegação privada / cookies bloqueados: gera um id volátil. O leitor
    // consegue votar, mas a trava de voto único vale só para a sessão atual.
    return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

const VOTOU_KEY = (cargo: CargoSlug) => `98fm-enquete:votou:${cargo}`;

export function jaVotouLocalmente(cargo: CargoSlug): boolean {
  try {
    return localStorage.getItem(VOTOU_KEY(cargo)) === '1';
  } catch {
    return false;
  }
}

export function marcarVotouLocalmente(cargo: CargoSlug): void {
  try {
    localStorage.setItem(VOTOU_KEY(cargo), '1');
  } catch {
    // sem localStorage a trava fica apenas no estado em memória do widget
  }
}

/* ------------------------------- apresentação ------------------------------ */

export function formatarNumero(valor: number): string {
  return valor.toLocaleString('pt-BR');
}

export function formatarPercentual(valor: number): string {
  return `${valor.toFixed(1).replace('.', ',')}%`;
}

/** Normaliza para busca: sem acento, minúsculo. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filtrarCandidatos(candidatos: Candidato[], termo: string): Candidato[] {
  const busca = normalizarBusca(termo);
  if (!busca) return candidatos;
  return candidatos.filter(c =>
    [c.nome, c.numero, c.partido, c.nomeCompleto ?? '']
      .some(campo => normalizarBusca(campo).includes(busca)),
  );
}
