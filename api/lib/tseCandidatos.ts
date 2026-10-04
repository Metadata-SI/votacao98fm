import type { Candidato, CargoCandidatos, CargoSlug, VinculadoCandidato } from '../../shared/enquete-types';

/*
 * Fonte dos candidatos: os JSONs estáticos que o TSE publica em
 * resultados.tse.jus.br. São os mesmos arquivos que alimentam o site oficial de
 * divulgação, então trazem nome de urna, número, partido, coligação, suplentes
 * e a foto oficial de cada candidato.
 *
 * O catálogo de eleições fica em /oficial/comum/config/ele-c.json. Para 2026:
 *   - eleição 6257 (federal, abrangência "br") -> Presidente
 *   - eleição 6259 (estadual, abrangência "rn") -> Governador, Senador, Deputados
 *
 * Caminho de cada arquivo de cargo:
 *   /oficial/<ciclo>/<eleicao>/dados/<uf>/<uf>-c<cargo 4 dígitos>-e<eleicao 6 dígitos>-u.json
 */

const BASE = 'https://resultados.tse.jus.br/oficial';
const CICLO = process.env.TSE_CICLO || 'ele2026';
const ELEICAO_FEDERAL = process.env.TSE_ELEICAO_FEDERAL || '6257';
const ELEICAO_ESTADUAL = process.env.TSE_ELEICAO_ESTADUAL || '6259';
const UF = (process.env.TSE_UF || 'rn').toLowerCase();

interface CargoFonte {
  codigoCargo: string;
  eleicao: string;
  abrangencia: string;
}

export const CARGO_FONTES: Record<CargoSlug, CargoFonte> = {
  presidente: { codigoCargo: '1', eleicao: ELEICAO_FEDERAL, abrangencia: 'br' },
  governador: { codigoCargo: '3', eleicao: ELEICAO_ESTADUAL, abrangencia: UF },
  senador: { codigoCargo: '5', eleicao: ELEICAO_ESTADUAL, abrangencia: UF },
  'deputado-federal': { codigoCargo: '6', eleicao: ELEICAO_ESTADUAL, abrangencia: UF },
  'deputado-estadual': { codigoCargo: '7', eleicao: ELEICAO_ESTADUAL, abrangencia: UF },
};

function pad(value: string, size: number): string {
  return value.padStart(size, '0');
}

function urlCargo({ codigoCargo, eleicao, abrangencia }: CargoFonte): string {
  const arquivo = `${abrangencia}-c${pad(codigoCargo, 4)}-e${pad(eleicao, 6)}-u.json`;
  return `${BASE}/${CICLO}/${eleicao}/dados/${abrangencia}/${arquivo}`;
}

export function urlFoto(fonte: CargoFonte, sqcand: string): string {
  return `${BASE}/${CICLO}/${fonte.eleicao}/fotos/${fonte.abrangencia}/${sqcand}.jpeg`;
}

/* -------------------------- formato cru do TSE --------------------------- */

interface TseVinculado {
  tp?: string;
  nm?: string;
  nmu?: string;
  sgp?: string;
}

interface TseCandidato {
  n: string; // número na urna
  sqcand: string;
  nm: string; // nome completo
  nmu?: string; // nome de urna
  st?: string; // situação ("", "Deferido", "Indeferido"...)
  e?: string; // "s" se eleito
  vs?: TseVinculado[]; // vice / suplentes
}

interface TsePartido {
  n: string;
  sg: string;
  nm: string;
  cand: TseCandidato[];
}

interface TseAgremiacao {
  nm: string;
  tp?: string; // "i" = partido isolado, caso contrário coligação
  par: TsePartido[];
}

interface TseCargoArquivo {
  carg: Array<{ cd: string; nmn: string; nv?: string; agr: TseAgremiacao[] }>;
  dg?: string;
  hg?: string;
}

/* ------------------------------ normalização ------------------------------ */

function normalizarVinculados(vs: TseVinculado[] | undefined): VinculadoCandidato[] {
  if (!vs) return [];
  return vs.map(v => ({
    tipo: v.tp ?? null,
    nome: v.nmu || v.nm || '',
    partido: v.sgp || '',
  }));
}

/**
 * Candidatos de cargo proporcional vêm com número de 4-5 dígitos e são muitos
 * (99 federais, 148 estaduais no RN). Ordenar por tamanho e depois pelo número
 * mantém a lista estável e previsível entre atualizações, o que importa porque
 * a enquete é renderizada dentro de um iframe que o leitor pode recarregar.
 */
function ordenarCandidatos(candidatos: Candidato[]): Candidato[] {
  return [...candidatos].sort((a, b) =>
    a.numero.length - b.numero.length || a.numero.localeCompare(b.numero, 'pt-BR'),
  );
}

export function normalizarCargo(cargo: CargoSlug, arquivo: TseCargoArquivo): CargoCandidatos {
  const bloco = arquivo.carg?.[0];
  if (!bloco) throw new Error(`Arquivo do TSE sem bloco de cargo para "${cargo}".`);

  const fonte = CARGO_FONTES[cargo];
  const candidatos: Candidato[] = [];

  for (const agr of bloco.agr ?? []) {
    const isColigacao = agr.tp !== 'i';
    for (const par of agr.par ?? []) {
      for (const cand of par.cand ?? []) {
        candidatos.push({
          id: cand.sqcand,
          numero: cand.n,
          nome: cand.nmu || cand.nm,
          nomeCompleto: cand.nm ?? null,
          partido: par.sg,
          partidoNome: par.nm,
          coligacao: isColigacao ? agr.nm : null,
          situacao: cand.st || null,
          eleito: cand.e === 's',
          foto: urlFoto(fonte, cand.sqcand),
          vices: normalizarVinculados(cand.vs),
        });
      }
    }
  }

  return {
    cargo,
    codigoCargo: bloco.cd,
    nome: bloco.nmn,
    vagas: Number(bloco.nv) || 1,
    abrangencia: fonte.abrangencia,
    codigoEleicao: fonte.eleicao,
    atualizadoEm: arquivo.dg && arquivo.hg ? `${arquivo.dg} ${arquivo.hg}` : null,
    candidatos: ordenarCandidatos(candidatos),
  };
}

export async function buscarCargo(cargo: CargoSlug): Promise<CargoCandidatos> {
  const fonte = CARGO_FONTES[cargo];
  const res = await fetch(urlCargo(fonte), {
    headers: {
      // O CDN do TSE recusa requisições sem User-Agent de navegador.
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://resultados.tse.jus.br/',
    },
  });

  if (!res.ok) throw new Error(`TSE respondeu HTTP ${res.status} para o cargo "${cargo}".`);

  return normalizarCargo(cargo, (await res.json()) as TseCargoArquivo);
}
