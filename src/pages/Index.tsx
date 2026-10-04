import { useMemo, useState } from 'react';
import { AlertTriangle, Code2, Database, LayoutGrid, RefreshCw, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CargoCard from '@/components/CargoCard';
import EmbedDialog from '@/components/EmbedDialog';
import RodapeParceria from '@/components/RodapeParceria';
import { useCandidatos, useResultadoEnquete } from '@/hooks/useCandidatos';
import { CARGOS_META, CARGOS_ORDEM, formatarNumero, type CargoMeta } from '@/lib/enquete';
import metadataIcon from '@/assets/metadata-icon.png';
import metadataLogoFull from '@/assets/metadata-logo-new.png';

function Kpi({
  title,
  value,
  valueColor,
  sub,
}: {
  title: string;
  value: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">{title}</p>
      <p className="text-2xl font-bold leading-tight" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function Index() {
  const { data, isLoading, isFetching, error, refetch } = useCandidatos();
  const [cargoParaIncorporar, setCargoParaIncorporar] = useState<CargoMeta | null>(null);

  // Cada cargo tem a sua própria contagem, então são cinco consultas. Ficam
  // escritas uma a uma de propósito: hook dentro de laço quebra a regra de
  // ordem estável dos hooks do React.
  const presidente = useResultadoEnquete('presidente');
  const governador = useResultadoEnquete('governador');
  const senador = useResultadoEnquete('senador');
  const deputadoFederal = useResultadoEnquete('deputado-federal');
  const deputadoEstadual = useResultadoEnquete('deputado-estadual');

  const apuracoes = [presidente, governador, senador, deputadoFederal, deputadoEstadual];
  const participantes = apuracoes.some(c => c.data)
    ? apuracoes.reduce((soma, c) => soma + (c.data?.totalParticipantes ?? 0), 0)
    : null;

  // A persistência vem no payload dos votos; basta olhar um cargo para saber
  // se os votos estão só em memória (dev / sem Supabase configurado).
  const votosEmMemoria = presidente.data?.persistencia === 'memoria';

  const totalCandidatos = useMemo(() => {
    if (!data) return null;
    return CARGOS_ORDEM.reduce((soma, cargo) => soma + (data.cargos[cargo]?.candidatos.length ?? 0), 0);
  }, [data]);

  const atualizadoNaFonte = data?.cargos?.presidente?.atualizadoEm ?? null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="dashboard-header px-4 py-3 sm:px-6">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <img src={metadataIcon} alt="Metadata" className="hidden sm:block h-12 object-contain flex-shrink-0" />
            <div className="h-6 w-px bg-border flex-shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-semibold tracking-tight text-foreground truncate">
                ENQUETES 98FM — ELEIÇÕES 2026
              </h1>
            </div>
          </div>
          <img src={metadataLogoFull} alt="Metadata" className="object-contain w-24 sm:w-[120px] flex-shrink-0" />
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-3 py-4 sm:px-6 sm:py-5">
        <main className="space-y-10">
          {/* Visão geral */}
          <section id="geral" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="panel-title flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-primary" aria-hidden="true" />
                Painel de Enquetes
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                  Rio Grande do Norte · 2026
                </span>
                <Button onClick={() => refetch()} disabled={isFetching} size="sm">
                  <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
                  {isFetching ? 'Atualizando...' : 'Atualizar candidatos'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <Kpi title="Cargos em enquete" value={String(CARGOS_ORDEM.length)} sub="Um card e um embed por cargo" />
              <Kpi
                title="Candidatos disponíveis"
                value={totalCandidatos !== null ? formatarNumero(totalCandidatos) : '—'}
                valueColor="hsl(222, 80%, 55%)"
                sub="Somando os cinco cargos"
              />
              <Kpi
                title="Participantes"
                value={participantes !== null ? formatarNumero(participantes) : '—'}
                valueColor="hsl(150, 45%, 42%)"
                sub="Votos únicos em todas as enquetes"
              />
              <Kpi
                title="Origem dos dados"
                value={data?.origem === 'tse' ? 'TSE ao vivo' : data ? 'Retrato local' : '—'}
                sub={atualizadoNaFonte ? `Fonte: ${atualizadoNaFonte}` : 'resultados.tse.jus.br'}
              />
            </div>

            {error && (
              <div className="stat-card border-destructive/40 bg-destructive/5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Não foi possível carregar os candidatos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {error instanceof Error ? error.message : 'Erro desconhecido.'}
                  </p>
                </div>
              </div>
            )}

            {data?.origem === 'snapshot' && !error && (
              <div className="stat-card border-amber-300/60 bg-amber-50 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Exibindo o retrato local das candidaturas</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    O serviço do TSE não respondeu, então a lista vem do arquivo salvo no projeto. As enquetes
                    continuam funcionando normalmente.
                  </p>
                </div>
              </div>
            )}

            {votosEmMemoria && (
              <div className="stat-card border-amber-300/60 bg-amber-50 flex items-start gap-3">
                <Database className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Votos guardados apenas em memória</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Defina <code className="font-mono">SUPABASE_URL</code> e{' '}
                    <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> antes de publicar as enquetes — sem
                    isso a contagem se perde a cada deploy e não é compartilhada entre as instâncias.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Cards por cargo */}
          <section id="cargos" className="pt-2 border-t space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="panel-title flex items-center gap-2">
                <Vote className="w-5 h-5 text-primary" aria-hidden="true" />
                Enquetes por cargo
              </h2>
              <p className="text-xs text-muted-foreground">
                Clique em <span className="font-semibold text-foreground">Incorporar</span> para pegar o código do
                site.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CARGOS_ORDEM.map(cargo => (
                <CargoCard
                  key={cargo}
                  meta={CARGOS_META[cargo]}
                  dados={data?.cargos?.[cargo] ?? null}
                  carregando={isLoading}
                  onIncorporar={() => setCargoParaIncorporar(CARGOS_META[cargo])}
                />
              ))}
            </div>
          </section>

          {/* Instruções */}
          <section id="como-incorporar" className="pt-2 border-t space-y-6">
            <h2 className="panel-title flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" aria-hidden="true" />
              Como publicar no 98fmnatal.com.br
            </h2>

            <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  titulo: 'Escolha o cargo',
                  texto: 'Cada card gera uma enquete independente, com a sua própria contagem de votos.',
                },
                {
                  titulo: 'Copie o código',
                  texto: 'Em "Incorporar", confira o endereço do painel e copie o bloco de HTML.',
                },
                {
                  titulo: 'Cole na matéria',
                  texto: 'No editor do site, use o bloco de HTML personalizado e cole o código ali.',
                },
                {
                  titulo: 'Acompanhe aqui',
                  texto: 'O número de participantes de cada enquete aparece no card, atualizado a cada 30 segundos.',
                },
              ].map((passo, indice) => (
                <li key={passo.titulo} className="stat-card">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
                    {indice + 1}
                  </span>
                  <p className="text-sm font-semibold text-foreground">{passo.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{passo.texto}</p>
                </li>
              ))}
            </ol>

            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
              As opções de cada cargo vêm dos arquivos oficiais de candidaturas do TSE
              (resultados.tse.jus.br). As enquetes medem a opinião dos ouvintes da 98FM, não têm valor
              científico e não substituem pesquisa registrada nem a apuração oficial.
            </p>
          </section>
        </main>
      </div>

      <RodapeParceria />

      <EmbedDialog
        meta={cargoParaIncorporar}
        aberto={cargoParaIncorporar !== null}
        onFechar={() => setCargoParaIncorporar(null)}
      />
    </div>
  );
}
