import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { MunicipioColeta, META_TOTAL } from '@/lib/coleta';
import type { ResultadoPayload } from '@/lib/coleta';
import { AUTO_REFRESH_MS } from '@/hooks/useColeta';
import ColetaFilters from '@/components/ColetaFilters';

function Kpi({ title, value, valueColor, sub }: { title: string; value: string; valueColor?: string; sub?: string }) {
  return (
    <div className="stat-card">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">{title}</p>
      <p className="text-2xl font-bold leading-tight" style={valueColor ? { color: valueColor } : undefined}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

interface PanelResumoColetaProps {
  payload: ResultadoPayload | null;
  municipios: MunicipioColeta[];
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  ultimaVerificacao: Date | null;
  error: string | null;
  atualizarAgora: () => void;
  refreshing: boolean;
}

export default function PanelResumoColeta({
  payload, municipios, autoRefresh, setAutoRefresh, ultimaVerificacao, error, atualizarAgora, refreshing,
}: PanelResumoColetaProps) {
  const totalRealizado = payload?.totalEntrevistas ?? 0;
  const totalPlanejado = META_TOTAL;
  const restante = totalPlanejado !== null ? Math.max(0, totalPlanejado - totalRealizado) : null;
  const percentualGeral = totalPlanejado !== null && totalPlanejado > 0 ? Math.min(100, (totalRealizado / totalPlanejado) * 100) : null;

  const semMetasMunicipio = municipios.every(m => m.meta === null);
  const metasAtingidas = municipios.filter(m => m.status === 'concluído' || m.status === 'excedente').length;
  const naoIniciados = municipios.filter(m => m.realizado === 0).length;

  // Cronômetro regressivo até a próxima busca automática — só faz sentido enquanto
  // a atualização automática está ativa e já houve uma primeira verificação.
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!autoRefresh || !ultimaVerificacao) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [autoRefresh, ultimaVerificacao]);
  const segundosParaProximaConsulta = autoRefresh && ultimaVerificacao
    ? Math.max(0, Math.ceil((ultimaVerificacao.getTime() + AUTO_REFRESH_MS - agora) / 1000))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="panel-title flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" aria-hidden="true" />
          Visão Geral da Coleta
        </h2>
        <ColetaFilters
          municipios={municipios}
          atualizarAgora={atualizarAgora}
          refreshing={refreshing}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          error={error}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi title="Total Planejado" value={totalPlanejado !== null ? totalPlanejado.toLocaleString('pt-BR') : '—'} />
        <Kpi title="Total Realizado" value={totalRealizado.toLocaleString('pt-BR')} valueColor="hsl(222, 80%, 55%)" />
        <Kpi title="Quantidade Restante" value={restante !== null ? restante.toLocaleString('pt-BR') : '—'} valueColor={restante !== null && restante > 0 ? 'hsl(0, 65%, 50%)' : undefined} />
        <Kpi title="Percentual Geral" value={percentualGeral !== null ? `${percentualGeral.toFixed(1)}%` : '—'} valueColor="hsl(150, 45%, 38%)" />
        <Kpi
          title="Metas Atingidas"
          value={semMetasMunicipio ? '—' : metasAtingidas.toString()}
          sub="Municípios com meta atingida ou ultrapassada"
        />
        <Kpi
          title="Não Iniciados"
          value={naoIniciados.toString()}
          sub="Municípios sem nenhuma entrevista"
        />
      </div>

      {/* Progresso geral */}
      <div className="stat-card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Progresso geral da coleta</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl font-bold leading-none text-foreground">{totalRealizado.toLocaleString('pt-BR')}</span>
              {totalPlanejado !== null && (
                <span className="text-base font-medium text-muted-foreground">/ {totalPlanejado.toLocaleString('pt-BR')} entrevistas</span>
              )}
              {percentualGeral !== null && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: 'hsl(222, 80%, 55%)', backgroundColor: 'hsla(222, 80%, 55%, 0.12)' }}
                >
                  {percentualGeral.toFixed(1)}%
                </span>
              )}
            </div>
            {restante !== null && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {restante > 0
                  ? <>Faltam <span className="font-semibold text-foreground">{restante.toLocaleString('pt-BR')}</span> entrevistas para concluir</>
                  : 'Meta geral atingida'}
              </p>
            )}
          </div>
          <div className="text-xs text-muted-foreground sm:text-right space-y-0.5">
            <p>Última verificação: <span className="font-medium text-foreground">{ultimaVerificacao ? ultimaVerificacao.toLocaleString('pt-BR') : '—'}</span></p>
            <p>Atualizado na fonte: <span className="font-medium text-foreground">{payload?.atualizadoEm || '—'}</span></p>
            {segundosParaProximaConsulta !== null && (
              <p>Próxima consulta em: <span className="font-medium text-foreground">{segundosParaProximaConsulta}s</span></p>
            )}
            <p>
              Atualização automática:{' '}
              <span className={`font-medium ${autoRefresh ? 'text-emerald-600' : 'text-amber-600'}`}>
                {autoRefresh ? 'Ativa (60s)' : 'Encerrada'}
              </span>
              {' — '}
              <span className={`font-medium ${error ? 'text-destructive' : 'text-emerald-600'}`}>
                {error ? 'Erro na última verificação' : 'Atualizado'}
              </span>
            </p>
          </div>
        </div>
        <div className="h-3.5 bg-muted rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full transition-all bg-gradient-to-r from-primary/70 to-primary"
            style={{ width: `${Math.max(percentualGeral ?? 0, percentualGeral && percentualGeral > 0 ? 2 : 0)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
