import type { CargoSlug, EscolhaVoto, ResultadoCandidato, ResultadoEnquete } from '../../shared/enquete-types';

/*
 * Armazenamento dos votos da enquete.
 *
 * Em produção grava no Postgres do Supabase, pela API REST (PostgREST) — fala
 * HTTP puro, então funciona em função serverless sem conexão TCP persistente e
 * sem dependência nova no package.json. Precisa de:
 *
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * A estrutura das tabelas está em supabase/migracoes/001_enquetes.sql.
 *
 * Sem essas variáveis cai para um Map em memória, que serve para rodar
 * `npm run dev` e testar o fluxo. Atenção: em memória cada instância serverless
 * tem a sua própria contagem e ela se perde a cada deploy ou hibernação — por
 * isso o payload de resultado expõe `persistencia`, e o painel mostra um aviso
 * quando vem "memoria".
 */

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const persistencia: 'supabase' | 'memoria' =
  SUPABASE_URL && SERVICE_KEY ? 'supabase' : 'memoria';

/** A service role passa por cima da RLS — esta chave nunca pode ir ao navegador. */
function cabecalhos(extras: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SERVICE_KEY as string,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extras,
  };
}

async function requisitar(caminho: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, init);
  } catch (err) {
    // Causa quase sempre é SUPABASE_URL errada ou o projeto pausado. O erro cru
    // do fetch ("fetch failed") não diz nada a quem for investigar.
    throw new Error(
      `Não foi possível falar com o Supabase em ${SUPABASE_URL}. Confira SUPABASE_URL. (${
        err instanceof Error ? err.message : 'erro de rede'
      })`,
    );
  }
}

async function erroDe(res: Response, acao: string): Promise<Error> {
  if (res.status === 401 || res.status === 403) {
    return new Error('O Supabase recusou a credencial. Confira SUPABASE_SERVICE_ROLE_KEY.');
  }

  const corpo = await res.text();
  if (res.status === 404 && corpo.includes('PGRST205')) {
    return new Error(
      'As tabelas da enquete não existem neste projeto. Rode supabase/migracoes/001_enquetes.sql no SQL Editor.',
    );
  }
  return new Error(`Supabase respondeu HTTP ${res.status} ao ${acao}: ${corpo.slice(0, 200)}`);
}

/* ------------------------------ fallback local ----------------------------- */

interface MemoriaCargo {
  votos: Map<string, number>;
  porPosicao: Map<number, Map<string, number>>;
  eleitores: Set<string>;
}

const memoria = new Map<CargoSlug, MemoriaCargo>();

function memoriaDo(cargo: CargoSlug): MemoriaCargo {
  let atual = memoria.get(cargo);
  if (!atual) {
    atual = { votos: new Map(), porPosicao: new Map(), eleitores: new Set() };
    memoria.set(cargo, atual);
  }
  return atual;
}

/* --------------------------------- leitura -------------------------------- */

function montarResultado(
  cargo: CargoSlug,
  votos: Map<string, number>,
  porPosicao: Map<number, Map<string, number>>,
  totalParticipantes: number,
): ResultadoEnquete {
  const totalVotos = [...votos.values()].reduce((soma, n) => soma + n, 0);
  const temPosicoes = porPosicao.size > 0;

  const resultados: ResultadoCandidato[] = [...votos.entries()]
    .map(([candidatoId, qtd]) => {
      const item: ResultadoCandidato = {
        candidatoId,
        votos: qtd,
        percentual: totalVotos > 0 ? (qtd / totalVotos) * 100 : 0,
      };
      if (temPosicoes) {
        const quebra: Record<number, number> = {};
        for (const [posicao, mapa] of porPosicao) {
          const valor = mapa.get(candidatoId);
          if (valor) quebra[posicao] = valor;
        }
        if (Object.keys(quebra).length > 0) item.porPosicao = quebra;
      }
      return item;
    })
    .sort((a, b) => b.votos - a.votos);

  return {
    cargo,
    totalVotos,
    totalParticipantes,
    resultados,
    atualizadoEm: new Date().toISOString(),
    persistencia,
  };
}

interface LinhaResultado {
  candidato_id: string;
  posicao: number;
  votos: number;
}

export async function lerResultado(cargo: CargoSlug, _posicoes: number[]): Promise<ResultadoEnquete> {
  if (persistencia === 'memoria') {
    const m = memoriaDo(cargo);
    return montarResultado(cargo, m.votos, m.porPosicao, m.eleitores.size);
  }

  const filtro = `cargo=eq.${encodeURIComponent(cargo)}`;
  const [resApuracao, resParticipantes] = await Promise.all([
    requisitar(`resultados_enquete?${filtro}&select=candidato_id,posicao,votos`, {
      headers: cabecalhos(),
    }),
    requisitar(`participantes_enquete?${filtro}&select=participantes`, { headers: cabecalhos() }),
  ]);

  if (!resApuracao.ok) throw await erroDe(resApuracao, 'ler a apuração');
  if (!resParticipantes.ok) throw await erroDe(resParticipantes, 'contar participantes');

  const linhas = (await resApuracao.json()) as LinhaResultado[];
  const participantes = (await resParticipantes.json()) as Array<{ participantes: number }>;

  // O banco devolve a contagem por candidato E posição; o total por candidato é
  // a soma das posições (no Senado, 1º + 2º voto).
  const votos = new Map<string, number>();
  const porPosicao = new Map<number, Map<string, number>>();

  for (const linha of linhas) {
    votos.set(linha.candidato_id, (votos.get(linha.candidato_id) ?? 0) + linha.votos);

    let mapa = porPosicao.get(linha.posicao);
    if (!mapa) {
      mapa = new Map();
      porPosicao.set(linha.posicao, mapa);
    }
    mapa.set(linha.candidato_id, linha.votos);
  }

  return montarResultado(cargo, votos, porPosicao, participantes[0]?.participantes ?? 0);
}

/* -------------------------------- gravação -------------------------------- */

export interface RegistroVoto {
  registrado: boolean;
  motivo?: 'ja-votou';
}

/**
 * Registra as escolhas de um eleitor. Devolve `registrado: false` quando aquele
 * `eleitorId` já havia votado neste cargo.
 *
 * As linhas vão num único INSERT, então ou entram todas ou nenhuma. Quem detecta
 * o voto repetido é o índice único (cargo, eleitor_id, posicao), que o Postgres
 * avalia de forma atômica: duas requisições simultâneas do mesmo leitor não
 * contam duas vezes.
 */
export async function registrarVoto(
  cargo: CargoSlug,
  escolhas: EscolhaVoto[],
  eleitorId: string,
): Promise<RegistroVoto> {
  if (persistencia === 'memoria') {
    const m = memoriaDo(cargo);
    if (m.eleitores.has(eleitorId)) return { registrado: false, motivo: 'ja-votou' };
    m.eleitores.add(eleitorId);
    for (const { candidatoId, posicao } of escolhas) {
      m.votos.set(candidatoId, (m.votos.get(candidatoId) ?? 0) + 1);
      let mapaPosicao = m.porPosicao.get(posicao);
      if (!mapaPosicao) {
        mapaPosicao = new Map();
        m.porPosicao.set(posicao, mapaPosicao);
      }
      mapaPosicao.set(candidatoId, (mapaPosicao.get(candidatoId) ?? 0) + 1);
    }
    return { registrado: true };
  }

  const linhas = escolhas.map(({ candidatoId, posicao }) => ({
    cargo,
    candidato_id: candidatoId,
    posicao,
    eleitor_id: eleitorId,
  }));

  const res = await requisitar('votos', {
    method: 'POST',
    headers: cabecalhos({ Prefer: 'return=minimal' }),
    body: JSON.stringify(linhas),
  });

  if (res.status === 409) return { registrado: false, motivo: 'ja-votou' };
  if (!res.ok) throw await erroDe(res, 'registrar o voto');

  return { registrado: true };
}

/** Usado para zerar uma enquete antes de publicá-la. */
export async function zerarEnquete(cargo: CargoSlug, _posicoes: number[]): Promise<void> {
  if (persistencia === 'memoria') {
    memoria.delete(cargo);
    return;
  }

  const res = await requisitar(`votos?cargo=eq.${encodeURIComponent(cargo)}`, {
    method: 'DELETE',
    headers: cabecalhos({ Prefer: 'return=minimal' }),
  });

  if (!res.ok) throw await erroDe(res, 'zerar a enquete');
}
