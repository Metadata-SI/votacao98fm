import { createHmac, timingSafeEqual } from 'node:crypto';

/*
 * Sessão do painel.
 *
 * A senha fica só no servidor (`PAINEL_SENHA`) — nunca é embutida no bundle do
 * navegador, senão bastaria abrir o JavaScript para lê-la. O cliente só recebe
 * um cookie assinado dizendo "esta sessão passou pela senha".
 *
 * O cookie é assinado com HMAC usando a própria senha como chave. Efeito útil:
 * trocar a senha invalida todas as sessões abertas, sem precisar de outra
 * variável de ambiente nem de tabela de sessões.
 */

const SENHA = process.env.PAINEL_SENHA;
const DURACAO_MS = 12 * 60 * 60 * 1000; // 12h — cobre um dia de trabalho na redação

export const COOKIE = 'painel_sessao';

/** Sem senha configurada o painel fica aberto, e a interface avisa isso. */
export const senhaConfigurada = Boolean(SENHA && SENHA.length > 0);

function comparar(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  // timingSafeEqual exige mesmo tamanho; comparar o tamanho antes já vaza
  // apenas o comprimento, que não ajuda quem tenta adivinhar o conteúdo.
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function senhaConfere(tentativa: unknown): boolean {
  if (!senhaConfigurada || typeof tentativa !== 'string') return false;
  return comparar(tentativa, SENHA as string);
}

function assinar(expiraEm: number): string {
  return createHmac('sha256', SENHA as string).update(`painel.${expiraEm}`).digest('base64url');
}

export function criarToken(): { token: string; expiraEm: number } {
  const expiraEm = Date.now() + DURACAO_MS;
  return { token: `${expiraEm}.${assinar(expiraEm)}`, expiraEm };
}

export function tokenValido(token: string | undefined): boolean {
  if (!senhaConfigurada) return true; // painel aberto
  if (!token) return false;

  const separador = token.indexOf('.');
  if (separador < 1) return false;

  const expiraEm = Number(token.slice(0, separador));
  const assinatura = token.slice(separador + 1);
  if (!Number.isFinite(expiraEm) || !assinatura) return false;
  if (Date.now() > expiraEm) return false;

  return comparar(assinatura, assinar(expiraEm));
}

export function lerCookie(cabecalho: string | undefined, nome: string): string | undefined {
  if (!cabecalho) return undefined;
  for (const parte of cabecalho.split(';')) {
    const igual = parte.indexOf('=');
    if (igual < 0) continue;
    if (parte.slice(0, igual).trim() === nome) return decodeURIComponent(parte.slice(igual + 1).trim());
  }
  return undefined;
}

/*
 * HttpOnly para o JavaScript da página não conseguir ler o cookie. SameSite=Lax
 * porque o painel é sempre aberto em aba própria — a enquete incorporada, que
 * roda em iframe de outro domínio, não usa sessão nenhuma. Secure só fora do
 * localhost, senão o navegador descarta o cookie em http://.
 */
export function cookieSessao(token: string, segundos: number, seguro: boolean): string {
  const partes = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${segundos}`,
  ];
  if (seguro) partes.push('Secure');
  return partes.join('; ');
}

export function cookieExpirado(seguro: boolean): string {
  return cookieSessao('', 0, seguro);
}
