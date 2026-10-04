import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useResultadoEnquete } from '@/hooks/useCandidatos';
import {
  formatarNumero,
  formatarPercentual,
  rotuloPosicao,
  type Candidato,
  type CargoSlug,
  type ResultadoEnquete,
} from '@/lib/enquete';

interface ResultadoEnqueteListaProps {
  cargo: CargoSlug;
  cor: string;
  candidatos: Candidato[];
  /** Votos por eleitor — 2 no Senado, o que habilita a quebra 1º/2º voto. */
  votos: number;
  /** Apuração devolvida pelo POST do voto, usada enquanto o GET não responde. */
  inicial?: ResultadoEnquete | null;
  /** Quantas linhas mostrar antes de resumir o resto. */
  limite?: number;
}

export default function ResultadoEnqueteLista({
  cargo,
  cor,
  candidatos,
  votos,
  inicial = null,
  limite = 12,
}: ResultadoEnqueteListaProps) {
  const { data, isLoading } = useResultadoEnquete(cargo);
  const apuracao = data ?? inicial;

  const porId = useMemo(() => new Map(candidatos.map(c => [c.id, c])), [candidatos]);

  if (!apuracao && isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (!apuracao || apuracao.totalVotos === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Ainda não há votos suficientes para mostrar o resultado.
      </p>
    );
  }

  const linhas = apuracao.resultados.slice(0, limite);
  const restantes = apuracao.resultados.length - linhas.length;
  const maior = linhas[0]?.percentual || 100;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
          Resultado parcial
        </p>
        <p className="text-[11px] text-muted-foreground">
          {formatarNumero(apuracao.totalParticipantes)}{' '}
          {apuracao.totalParticipantes === 1 ? 'participante' : 'participantes'}
          {votos > 1 && <> · {formatarNumero(apuracao.totalVotos)} votos</>}
        </p>
      </div>

      <ol className="space-y-2.5">
        {linhas.map((linha, indice) => {
          const candidato = porId.get(linha.candidatoId);
          // A barra é normalizada pela maior fatia para a leitura não ficar
          // achatada quando os percentuais são todos baixos (lista longa).
          const largura = maior > 0 ? (linha.percentual / maior) * 100 : 0;

          return (
            <li key={linha.candidatoId}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="text-sm text-foreground min-w-0 truncate">
                  <span className="text-muted-foreground tabular-nums mr-1.5">{indice + 1}.</span>
                  <span className="font-semibold">{candidato?.nome ?? 'Candidato'}</span>
                  {candidato && (
                    <span className="text-xs text-muted-foreground ml-1.5">
                      {candidato.numero} · {candidato.partido}
                    </span>
                  )}
                </p>
                <p className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: cor }}>
                  {formatarPercentual(linha.percentual)}
                </p>
              </div>

              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(largura, linha.votos > 0 ? 2 : 0)}%`, backgroundColor: cor }}
                />
              </div>

              <p className="text-[11px] text-muted-foreground mt-1">
                {formatarNumero(linha.votos)} {linha.votos === 1 ? 'voto' : 'votos'}
                {votos > 1 && linha.porPosicao && (
                  <>
                    {' — '}
                    {Object.entries(linha.porPosicao)
                      .map(
                        ([posicao, qtd]) =>
                          `${formatarNumero(qtd)} como ${rotuloPosicao(Number(posicao), votos).toLowerCase()}`,
                      )
                      .join(', ')}
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ol>

      {restantes > 0 && (
        <p className="text-[11px] text-muted-foreground text-center">
          e mais {restantes} {restantes === 1 ? 'candidato' : 'candidatos'} com votos
        </p>
      )}
    </div>
  );
}
