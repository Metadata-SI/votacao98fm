import { buscarCargo } from './lib/tseCandidatos.js';
import { CANDIDATOS_SNAPSHOT } from '../shared/candidatosSnapshot.js';
import { CARGO_SLUGS, type CandidatosPayload, type CargoSlug } from '../shared/enquete-types.js';
import { aplicarSegundoTurno } from '../shared/segundoTurno.js';
import type { ApiRequest, ApiResponse } from './lib/http.js';

/*
 * Lista de opções de cada cargo. Busca os cinco cargos no TSE em paralelo e,
 * se algum falhar, usa o retrato em shared/candidatosSnapshot.ts para aquele
 * cargo — a enquete incorporada no site não pode ficar sem opções porque o
 * CDN do TSE oscilou.
 *
 * Antes de responder, o recorte de 2º turno (shared/segundoTurno.ts) é aplicado,
 * de modo que o painel e a enquete incorporada vejam exatamente a mesma lista.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Cache de 10 min na borda: a lista de candidatos praticamente não muda, e
  // isso evita bater no TSE a cada carregamento do iframe.
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const filtro = typeof req.query?.cargo === 'string' ? (req.query.cargo as CargoSlug) : null;
  if (filtro && !CARGO_SLUGS.includes(filtro)) {
    res.status(400).json({ erro: `Cargo desconhecido: "${filtro}".` });
    return;
  }

  const alvos = filtro ? [filtro] : CARGO_SLUGS;

  const resultados = await Promise.all(
    alvos.map(async cargo => {
      try {
        return { cargo, dados: aplicarSegundoTurno(await buscarCargo(cargo)), doTse: true };
      } catch (err) {
        console.error(`Falha ao buscar "${cargo}" no TSE, usando snapshot:`, err);
        return { cargo, dados: aplicarSegundoTurno(CANDIDATOS_SNAPSHOT[cargo]), doTse: false };
      }
    }),
  );

  const payload: CandidatosPayload = {
    geradoEm: new Date().toISOString(),
    origem: resultados.every(r => r.doTse) ? 'tse' : 'snapshot',
    cargos: Object.fromEntries(resultados.map(r => [r.cargo, r.dados])),
  };

  res.status(200).json(payload);
}
