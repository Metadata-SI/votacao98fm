import {
  COOKIE,
  cookieExpirado,
  cookieSessao,
  criarToken,
  lerCookie,
  senhaConfere,
  senhaConfigurada,
  tokenValido,
} from './lib/sessao.js';
import type { ApiRequest, ApiResponse } from './lib/http.js';

/*
 * Sessão do painel da redação.
 *
 *   GET    -> diz se a sessão atual vale e se há senha configurada
 *   POST   -> { senha } valida e devolve o cookie de sessão
 *   DELETE -> encerra a sessão
 *
 * A enquete incorporada (/enquete/:cargo) e as rotas que ela consome
 * (/api/candidatos e /api/votos) continuam públicas: quem entra ali é o ouvinte
 * no site da rádio, não a redação.
 */

/** Atraso fixo em tentativa errada, para não virar um alvo cômodo de força bruta. */
const ESPERA_ERRO_MS = 700;

function ehSeguro(req: ApiRequest): boolean {
  const proto = req.headers?.['x-forwarded-proto'];
  const host = req.headers?.host;
  const anfitriao = Array.isArray(host) ? host[0] : host;
  // Em localhost o cookie não pode ser Secure, senão o navegador o descarta.
  if (anfitriao?.startsWith('localhost') || anfitriao?.startsWith('127.0.0.1')) return false;
  const esquema = Array.isArray(proto) ? proto[0] : proto;
  return esquema !== 'http';
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  const cookieAtual = lerCookie(
    Array.isArray(req.headers?.cookie) ? req.headers?.cookie[0] : req.headers?.cookie,
    COOKIE,
  );

  if (req.method === 'GET') {
    res.status(200).json({ autenticado: tokenValido(cookieAtual), senhaConfigurada });
    return;
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', cookieExpirado(ehSeguro(req)));
    res.status(200).json({ autenticado: false, senhaConfigurada });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido.' });
    return;
  }

  if (!senhaConfigurada) {
    res.status(200).json({ autenticado: true, senhaConfigurada: false });
    return;
  }

  const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  const { senha } = corpo as { senha?: unknown };

  if (!senhaConfere(senha)) {
    await new Promise(resolve => setTimeout(resolve, ESPERA_ERRO_MS));
    res.status(401).json({ erro: 'Senha incorreta.' });
    return;
  }

  const { token, expiraEm } = criarToken();
  const segundos = Math.max(1, Math.floor((expiraEm - Date.now()) / 1000));
  res.setHeader('Set-Cookie', cookieSessao(token, segundos, ehSeguro(req)));
  res.status(200).json({ autenticado: true, senhaConfigurada: true, expiraEm });
}
