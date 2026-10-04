import { buscarResultado } from './lib/parseResultado.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
  try {
    const payload = await buscarResultado();
    res.status(200).json(payload);
  } catch (err) {
    console.error('Erro em /api/resultado:', err);
    res.status(502).json({ erro: err instanceof Error ? err.message : 'Erro desconhecido ao buscar resultado.' });
  }
}
