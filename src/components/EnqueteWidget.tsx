import { useCallback, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, Loader2, Search, Vote } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CandidatoItem from '@/components/CandidatoItem';
import ResultadoEnqueteLista from '@/components/ResultadoEnqueteLista';
import { useCandidatosDoCargo } from '@/hooks/useCandidatos';
import {
  JaVotouError,
  enviarVoto,
  filtrarCandidatos,
  jaVotouLocalmente,
  marcarVotouLocalmente,
  obterEleitorId,
  rotuloPosicao,
  type CargoMeta,
  type EscolhaVoto,
  type ResultadoEnquete,
} from '@/lib/enquete';
import { cn } from '@/lib/utils';
import metadataLogo from '@/assets/metadata-logo-new.png';

interface EnqueteWidgetProps {
  meta: CargoMeta;
  /** Mostrar a apuração parcial depois do voto. */
  mostrarResultado?: boolean;
  /** No painel o widget é só uma amostra: seleciona, mas não grava voto. */
  somentePrevia?: boolean;
}

/** Mapa posição -> candidatoId. Cargo com 1 voto usa apenas a posição 1. */
type Selecao = Record<number, string | undefined>;

export default function EnqueteWidget({
  meta,
  mostrarResultado = true,
  somentePrevia = false,
}: EnqueteWidgetProps) {
  const { data, isLoading, error } = useCandidatosDoCargo(meta.slug);
  const cargoDados = data?.cargos?.[meta.slug] ?? null;
  const candidatos = cargoDados?.candidatos ?? [];

  const posicoes = useMemo(() => Array.from({ length: meta.votos }, (_, i) => i + 1), [meta.votos]);

  const [selecao, setSelecao] = useState<Selecao>({});
  const [termo, setTermo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [votou, setVotou] = useState(() => !somentePrevia && jaVotouLocalmente(meta.slug));
  const [resultado, setResultado] = useState<ResultadoEnquete | null>(null);

  const escolhidos = useMemo(
    () => Object.entries(selecao).filter(([, id]) => id) as Array<[string, string]>,
    [selecao],
  );
  const completo = escolhidos.length === meta.votos;

  /* -------------------------------- seleção -------------------------------- */

  const posicaoDe = useCallback(
    (candidatoId: string): number | null => posicoes.find(p => selecao[p] === candidatoId) ?? null,
    [posicoes, selecao],
  );

  const alternar = useCallback(
    (candidatoId: string) => {
      setErroEnvio(null);
      setSelecao(atual => {
        const jaEstaEm = posicoes.find(p => atual[p] === candidatoId);
        if (jaEstaEm) {
          // Desmarcar: no Senado o 2º voto sobe para o 1º, para não deixar buraco.
          const restantes = posicoes
            .filter(p => p !== jaEstaEm)
            .map(p => atual[p])
            .filter(Boolean) as string[];
          return Object.fromEntries(restantes.map((id, i) => [i + 1, id]));
        }

        const livre = posicoes.find(p => !atual[p]);
        if (livre) return { ...atual, [livre]: candidatoId };

        // Posições todas ocupadas: cargo de voto único troca a escolha;
        // no Senado, o clique substitui o último voto dado.
        if (meta.votos === 1) return { 1: candidatoId };
        return { ...atual, [posicoes[posicoes.length - 1]]: candidatoId };
      });
    },
    [meta.votos, posicoes],
  );

  /* --------------------------------- envio --------------------------------- */

  async function confirmar() {
    if (!completo || enviando) return;

    if (somentePrevia) {
      setVotou(true);
      return;
    }

    setEnviando(true);
    setErroEnvio(null);
    try {
      const escolhas: EscolhaVoto[] = escolhidos.map(([posicao, candidatoId]) => ({
        candidatoId,
        posicao: Number(posicao),
      }));
      const apuracao = await enviarVoto(meta.slug, escolhas, obterEleitorId());
      marcarVotouLocalmente(meta.slug);
      setResultado(apuracao);
      setVotou(true);
    } catch (err) {
      if (err instanceof JaVotouError) {
        marcarVotouLocalmente(meta.slug);
        setVotou(true);
      } else {
        setErroEnvio(err instanceof Error ? err.message : 'Não foi possível registrar seu voto.');
      }
    } finally {
      setEnviando(false);
    }
  }

  /* -------------------------------- estados -------------------------------- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin mx-auto text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Carregando candidatos...</p>
        </div>
      </div>
    );
  }

  if (error || candidatos.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 px-4">
        <div className="text-center space-y-2 max-w-sm">
          <AlertCircle className="w-7 h-7 mx-auto text-destructive" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">Enquete indisponível</p>
          <p className="text-xs text-muted-foreground">
            Não foi possível carregar a lista de candidatos agora. Recarregue a página em alguns instantes.
          </p>
        </div>
      </div>
    );
  }

  if (votou) {
    return (
      <div className="p-4 sm:p-5 space-y-4">
        <div className="text-center space-y-1">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Vote className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <p className="font-semibold text-foreground">
            {somentePrevia ? 'Voto simulado — esta é apenas a prévia' : 'Voto registrado. Obrigado!'}
          </p>
          <p className="text-xs text-muted-foreground">
            Enquete de opinião da 98FM. Não tem valor científico nem relação com a apuração oficial do TSE.
          </p>
        </div>

        {mostrarResultado && !somentePrevia && (
          <div className="max-h-[380px] overflow-y-auto pr-1 -mr-1">
            <ResultadoEnqueteLista
              cargo={meta.slug}
              cor={meta.cor}
              candidatos={candidatos}
              votos={meta.votos}
              inicial={resultado}
            />
          </div>
        )}

        {somentePrevia && (
          <div className="text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setVotou(false);
                setSelecao({});
              }}
            >
              Reiniciar prévia
            </Button>
          </div>
        )}
      </div>
    );
  }

  const lista = meta.listaLonga ? filtrarCandidatos(candidatos, termo) : candidatos;
  const faltam = meta.votos - escolhidos.length;

  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground leading-snug">{meta.pergunta}</h2>
          <p className="text-xs text-muted-foreground">
            {meta.votos > 1
              ? 'Escolha dois nomes: o 1º e o 2º voto. Não é possível votar duas vezes no mesmo candidato.'
              : 'Escolha uma opção e confirme seu voto.'}
          </p>
        </div>
        <img
          src={metadataLogo}
          alt="Metadata"
          className="h-6 w-auto object-contain flex-shrink-0 mt-0.5 hidden sm:block"
        />
      </div>

      {/* Painel de posições — só no Senado, onde há 1º e 2º voto */}
      {meta.votos > 1 && (
        <div className="grid grid-cols-2 gap-2">
          {posicoes.map(posicao => {
            const candidato = candidatos.find(c => c.id === selecao[posicao]);
            return (
              <div
                key={posicao}
                className={cn(
                  'rounded-lg border p-2.5 transition-colors',
                  candidato ? 'border-transparent' : 'border-dashed bg-muted/40',
                )}
                style={candidato ? { boxShadow: `inset 0 0 0 2px ${meta.cor}` } : undefined}
              >
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  {rotuloPosicao(posicao, meta.votos)}
                </p>
                {candidato ? (
                  <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                    <span className="tabular-nums" style={{ color: meta.cor }}>
                      {candidato.numero}
                    </span>{' '}
                    {candidato.nome}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-0.5">Não escolhido</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Busca — necessária nas listas de deputado, com 99 e 148 nomes */}
      {meta.listaLonga && (
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder="Buscar por nome, número ou partido"
            className="pl-9"
            aria-label="Buscar candidato"
          />
        </div>
      )}

      {/* Só esta faixa rola. Cabeçalho, busca, barra de confirmação e assinatura
          ficam parados, de modo que a enquete ocupe sempre o mesmo espaço na
          matéria em vez de esticar o iframe por mais de mil pixels. */}
      <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 -mr-1">
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum candidato encontrado para esse termo.
          </p>
        ) : (
          lista.map(candidato => {
            const posicao = posicaoDe(candidato.id);
            return (
              <CandidatoItem
                key={candidato.id}
                candidato={candidato}
                cor={meta.cor}
                selecionado={posicao !== null}
                rotuloSelecao={posicao !== null ? rotuloPosicao(posicao, meta.votos) : undefined}
                mostrarVinculados={!meta.listaLonga}
                onSelecionar={() => alternar(candidato.id)}
              />
            );
          })
        )}
      </div>

      {erroEnvio && (
        <p className="text-xs text-destructive flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-px flex-shrink-0" aria-hidden="true" />
          {erroEnvio}
        </p>
      )}

      {/* Fica abaixo da faixa que rola, encostada no rodapé, sempre visível. */}
      <div className="-mx-4 sm:-mx-5 px-4 sm:px-5 pt-3 pb-3 -mb-4 sm:-mb-5 bg-background border-t">
        <Button
          className="w-full"
          disabled={!completo || enviando}
          onClick={confirmar}
          style={completo ? { backgroundColor: meta.cor } : undefined}
        >
          {enviando ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              Registrando...
            </>
          ) : completo ? (
            'Confirmar voto'
          ) : meta.votos > 1 ? (
            `Falta escolher ${faltam} candidato${faltam > 1 ? 's' : ''}`
          ) : (
            'Escolha um candidato para confirmar'
          )}
        </Button>
        {mostrarResultado && (
          <p className="text-[11px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
            <BarChart3 className="w-3 h-3" aria-hidden="true" />
            O resultado parcial aparece depois que você votar.
          </p>
        )}
      </div>
    </div>
  );
}
