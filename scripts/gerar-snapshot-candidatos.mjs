#!/usr/bin/env node
/*
 * Regrava shared/candidatosSnapshot.ts com as candidaturas atuais do TSE.
 *
 *   npm run snapshot:candidatos
 *
 * O snapshot é só a rede de segurança de /api/candidatos: em operação normal a
 * API busca direto no TSE. Vale rodar isto quando a Justiça Eleitoral mexer em
 * algum registro (deferimento, substituição, renúncia).
 *
 * Para outra eleição ou outro estado, ajuste as variáveis de ambiente:
 *   TSE_CICLO, TSE_ELEICAO_FEDERAL, TSE_ELEICAO_ESTADUAL, TSE_UF
 * Os códigos de eleição estão em:
 *   https://resultados.tse.jus.br/oficial/comum/config/ele-c.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://resultados.tse.jus.br/oficial';
const CICLO = process.env.TSE_CICLO || 'ele2026';
const ELEICAO_FEDERAL = process.env.TSE_ELEICAO_FEDERAL || '6257';
const ELEICAO_ESTADUAL = process.env.TSE_ELEICAO_ESTADUAL || '6259';
const UF = (process.env.TSE_UF || 'rn').toLowerCase();

const CARGOS = [
  { slug: 'presidente', codigoCargo: '1', eleicao: ELEICAO_FEDERAL, abrangencia: 'br' },
  { slug: 'governador', codigoCargo: '3', eleicao: ELEICAO_ESTADUAL, abrangencia: UF },
  { slug: 'senador', codigoCargo: '5', eleicao: ELEICAO_ESTADUAL, abrangencia: UF },
  { slug: 'deputado-federal', codigoCargo: '6', eleicao: ELEICAO_ESTADUAL, abrangencia: UF },
  { slug: 'deputado-estadual', codigoCargo: '7', eleicao: ELEICAO_ESTADUAL, abrangencia: UF },
];

const CABECALHOS = {
  // O CDN do TSE recusa requisição sem User-Agent de navegador.
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://resultados.tse.jus.br/',
};

const pad = (valor, tamanho) => String(valor).padStart(tamanho, '0');

function urlCargo({ codigoCargo, eleicao, abrangencia }) {
  const arquivo = `${abrangencia}-c${pad(codigoCargo, 4)}-e${pad(eleicao, 6)}-u.json`;
  return `${BASE}/${CICLO}/${eleicao}/dados/${abrangencia}/${arquivo}`;
}

function urlFoto({ eleicao, abrangencia }, sqcand) {
  return `${BASE}/${CICLO}/${eleicao}/fotos/${abrangencia}/${sqcand}.jpeg`;
}

async function buscarCargo(fonte) {
  const res = await fetch(urlCargo(fonte), { headers: CABECALHOS });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${urlCargo(fonte)}`);
  const arquivo = await res.json();
  const bloco = arquivo.carg?.[0];
  if (!bloco) throw new Error(`Arquivo sem bloco de cargo para ${fonte.slug}`);

  const candidatos = [];
  for (const agr of bloco.agr ?? []) {
    const coligacao = agr.tp === 'i' ? null : agr.nm;
    for (const par of agr.par ?? []) {
      for (const cand of par.cand ?? []) {
        candidatos.push({
          id: cand.sqcand,
          numero: cand.n,
          nome: cand.nmu || cand.nm,
          nomeCompleto: cand.nm ?? null,
          partido: par.sg,
          partidoNome: par.nm,
          coligacao,
          situacao: cand.st || null,
          eleito: cand.e === 's',
          foto: urlFoto(fonte, cand.sqcand),
          vices: (cand.vs ?? []).map(v => ({
            tipo: v.tp ?? null,
            nome: v.nmu || v.nm || '',
            partido: v.sgp || '',
          })),
        });
      }
    }
  }

  candidatos.sort(
    (a, b) => a.numero.length - b.numero.length || a.numero.localeCompare(b.numero, 'pt-BR'),
  );

  return {
    cargo: fonte.slug,
    codigoCargo: bloco.cd,
    nome: bloco.nmn,
    vagas: Number(bloco.nv) || 1,
    abrangencia: fonte.abrangencia,
    codigoEleicao: fonte.eleicao,
    atualizadoEm: arquivo.dg && arquivo.hg ? `${arquivo.dg} ${arquivo.hg}` : null,
    candidatos,
  };
}

const destino = path.resolve(import.meta.dirname, '..', 'shared', 'candidatosSnapshot.ts');

const cargos = {};
for (const fonte of CARGOS) {
  const dados = await buscarCargo(fonte);
  cargos[fonte.slug] = dados;
  console.log(`${fonte.slug.padEnd(18)} ${String(dados.candidatos.length).padStart(4)} candidatos`);
}

const geradoEm = new Date().toISOString();
const conteudo = `import type { CargoCandidatos, CargoSlug } from './enquete-types';

/*
 * Retrato das candidaturas capturado dos arquivos oficiais do TSE em
 * ${geradoEm.slice(0, 10)}.
 *
 * Serve apenas como rede de segurança: /api/candidatos sempre tenta o TSE
 * primeiro e só cai para cá se a origem estiver fora do ar, para que a enquete
 * incorporada no 98fmnatal.com.br nunca apareça com a lista vazia.
 *
 * Arquivo gerado — não edite à mão. Para atualizar: \`npm run snapshot:candidatos\`.
 */
export const SNAPSHOT_GERADO_EM = '${geradoEm}';

export const CANDIDATOS_SNAPSHOT: Record<CargoSlug, CargoCandidatos> = ${JSON.stringify(cargos, null, 2)} as Record<CargoSlug, CargoCandidatos>;
`;

await fs.writeFile(destino, conteudo, 'utf8');
console.log(`\nGravado em ${path.relative(process.cwd(), destino)}`);
