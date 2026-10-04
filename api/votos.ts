import { lerResultado, registrarVoto } from './lib/votosStore.js';
import { CANDIDATOS_SNAPSHOT } from '../shared/candidatosSnapshot.js';
import { buscarCargo } from './lib/tseCandidatos.js';
import { CARGO_SLUGS, type CargoSlug, type EscolhaVoto } from '../shared/enquete-types.js';
import type { ApiRequest, ApiResponse } from './lib/http.js';

/*
 * GET  /api/votos?cargo=senador  -> apuração atual da enquete
 * POST /api/votos                -> registra o voto de um leitor
 *
 * O POST valida as escolhas contra a lista real de candidatos daquele cargo,
 * para que ninguém consiga inflar a enquete chamando a API com um id inventado.
 */

function cargoValido(valor: unknown): valor is CargoSlug {
  return typeof valor === 'string' && CARGO_SLUGS.includes(valor as CargoSlug);
}

async function candidatosDoCargo(cargo: CargoSlug) {
  try {
    return await buscarCargo(cargo);
  } catch {
    return CANDIDATOS_SNAPSHOT[cargo];
  }
}

/** Senado tem 2 vagas no RN, logo as posições válidas são 1 e 2. */
function posicoesDoCargo(vagas: number): number[] {
  return Array.from({ length: Math.max(1, vagas === 2 ? 2 : 1) }, (_, i) => i + 1);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const cargo = req.query?.cargo;
      if (!cargoValido(cargo)) {
        res.status(400).json({ erro: 'Informe ?cargo= com um cargo válido.' });
        return;
      }
      const { vagas } = await candidatosDoCargo(cargo);
      // A apuração muda a cada voto, então só um cache curtíssimo de borda.
      res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=30');
      res.status(200).json(await lerResultado(cargo, posicoesDoCargo(vagas)));
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ erro: 'Método não permitido.' });
      return;
    }

    const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
    const { cargo, escolhas, eleitorId } = corpo as {
      cargo?: unknown;
      escolhas?: unknown;
      eleitorId?: unknown;
    };

    if (!cargoValido(cargo)) {
      res.status(400).json({ erro: 'Cargo inválido.' });
      return;
    }
    if (typeof eleitorId !== 'string' || eleitorId.length < 8 || eleitorId.length > 100) {
      res.status(400).json({ erro: 'eleitorId ausente ou fora do formato esperado.' });
      return;
    }
    if (!Array.isArray(escolhas) || escolhas.length === 0) {
      res.status(400).json({ erro: 'Nenhuma escolha enviada.' });
      return;
    }

    const { candidatos, vagas } = await candidatosDoCargo(cargo);
    const posicoes = posicoesDoCargo(vagas);
    const idsValidos = new Set(candidatos.map(c => c.id));

    if (escolhas.length > posicoes.length) {
      res.status(400).json({ erro: `Este cargo aceita no máximo ${posicoes.length} escolha(s).` });
      return;
    }

    const normalizadas: EscolhaVoto[] = [];
    const posicoesUsadas = new Set<number>();
    const candidatosUsados = new Set<string>();

    for (const bruta of escolhas) {
      const candidatoId = (bruta as EscolhaVoto)?.candidatoId;
      const posicao = Number((bruta as EscolhaVoto)?.posicao);

      if (typeof candidatoId !== 'string' || !idsValidos.has(candidatoId)) {
        res.status(400).json({ erro: 'Escolha aponta para um candidato que não existe neste cargo.' });
        return;
      }
      if (!posicoes.includes(posicao) || posicoesUsadas.has(posicao)) {
        res.status(400).json({ erro: 'Posição de voto inválida ou repetida.' });
        return;
      }
      // No Senado o leitor dá dois votos, mas não pode votar duas vezes no mesmo nome.
      if (candidatosUsados.has(candidatoId)) {
        res.status(400).json({ erro: 'O mesmo candidato não pode receber o 1º e o 2º voto.' });
        return;
      }

      posicoesUsadas.add(posicao);
      candidatosUsados.add(candidatoId);
      normalizadas.push({ candidatoId, posicao });
    }

    const registro = await registrarVoto(cargo, normalizadas, eleitorId);
    if (!registro.registrado) {
      res.status(409).json({ erro: 'Este dispositivo já votou nesta enquete.', motivo: registro.motivo });
      return;
    }

    res.status(200).json(await lerResultado(cargo, posicoes));
  } catch (err) {
    console.error('Erro em /api/votos:', err);
    res.status(500).json({ erro: err instanceof Error ? err.message : 'Erro ao processar o voto.' });
  }
}
