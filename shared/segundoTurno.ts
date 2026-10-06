import type { CargoCandidatos, CargoSlug } from './enquete-types';

/*
 * Configuração do 2º turno.
 *
 * O TSE continua publicando o arquivo do 1º turno, com todos os candidatos.
 * Em vez de depender de um endpoint novo, a redação diz aqui quem disputa o
 * segundo turno de cada cargo — as funções de API usam esta lista para recortar
 * o que o leitor vê e para validar o voto, e a interface usa a cor de cada nome.
 *
 * Cargo que não aparece aqui segue normal, com a lista inteira e sem selo.
 *
 * Para voltar um cargo ao 1º turno, basta apagar a entrada dele.
 */

export interface FinalistaSegundoTurno {
  /** Número na urna — junto com o partido, identifica a candidatura. */
  numero: string;
  partido: string;
  /** Nome esperado, só para quem for editar este arquivo se localizar. */
  nome: string;
  /** Cor da candidatura na enquete (seleção, barra do resultado, selo). */
  cor: string;
}

export const SEGUNDO_TURNO: Partial<Record<CargoSlug, FinalistaSegundoTurno[]>> = {
  presidente: [
    { numero: '13', partido: 'PT', nome: 'LULA', cor: 'hsl(352, 78%, 45%)' },
    { numero: '22', partido: 'PL', nome: 'FLAVIO BOLSONARO', cor: 'hsl(214, 88%, 42%)' },
  ],
  governador: [
    { numero: '44', partido: 'UNIÃO', nome: 'ALLYSON', cor: 'hsl(221, 72%, 33%)' },
    { numero: '13', partido: 'PT', nome: 'CADU DE LULA', cor: 'hsl(352, 78%, 45%)' },
  ],
};

/** Compara partido ignorando acento e caixa: o TSE manda "UNIÃO", "MISSÃO"... */
function mesmoPartido(a: string, b: string): boolean {
  const limpar = (texto: string) =>
    texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  return limpar(a) === limpar(b);
}

export function ehSegundoTurno(cargo: CargoSlug): boolean {
  return (SEGUNDO_TURNO[cargo]?.length ?? 0) > 0;
}

export function finalistasDoCargo(cargo: CargoSlug): FinalistaSegundoTurno[] {
  return SEGUNDO_TURNO[cargo] ?? [];
}

/** Cor da candidatura, ou `padrao` fora do 2º turno. */
export function corDoCandidato(
  cargo: CargoSlug,
  candidato: { numero: string; partido: string } | null | undefined,
  padrao: string,
): string {
  if (!candidato) return padrao;
  const finalista = finalistasDoCargo(cargo).find(
    f => f.numero === candidato.numero && mesmoPartido(f.partido, candidato.partido),
  );
  return finalista?.cor ?? padrao;
}

/**
 * Recorta a lista do cargo para os dois finalistas, na ordem configurada.
 *
 * Se algum finalista não for encontrado na lista do TSE (número ou sigla que
 * mudou, arquivo fora do ar), devolve a lista original intacta: é melhor a
 * enquete ir ao ar com todos os nomes do que ficar com um candidato só.
 */
export function aplicarSegundoTurno(dados: CargoCandidatos): CargoCandidatos {
  const finalistas = finalistasDoCargo(dados.cargo);
  if (finalistas.length === 0) return dados;

  const selecionados = finalistas.map(f =>
    dados.candidatos.find(c => c.numero === f.numero && mesmoPartido(f.partido, c.partido)),
  );

  if (selecionados.some(c => !c)) {
    console.warn(
      `2º turno de "${dados.cargo}": nem todos os finalistas foram encontrados na lista do TSE. ` +
        'Mantendo a lista completa — confira shared/segundoTurno.ts.',
    );
    return dados;
  }

  return { ...dados, vagas: 1, candidatos: selecionados as CargoCandidatos['candidatos'] };
}
