import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { PontoHistorico } from '@/hooks/useColeta';

export default function PanelHistorico({ historico }: { historico: PontoHistorico[] }) {
  const data = historico.map(p => ({
    ...p,
    label: new Date(p.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <div className="space-y-4">
      <h2 className="panel-title flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
        Histórico da Coleta
      </h2>
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        O histórico é registrado automaticamente neste navegador a cada verificação (manual ou automática). Ele fica salvo
        localmente — se você limpar os dados do navegador ou abrir em outro dispositivo, o histórico reinicia.
      </div>

      <div className="stat-card">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Total de Entrevistas ao Longo do Tempo</p>
        {data.length < 2 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Ainda não há pontos suficientes de histórico. Volte em alguns minutos.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" fontSize={10} />
              <YAxis fontSize={10} allowDecimals={false} />
              <Tooltip formatter={(v: number) => [v, 'Entrevistas']} />
              <Line type="monotone" dataKey="totalEntrevistas" stroke="hsl(222, 80%, 55%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="stat-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Data/Hora da verificação</th>
              <th className="px-4 py-3 font-semibold text-right">Total realizado</th>
              <th className="px-4 py-3 font-semibold text-right">Variação</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((p, i, arr) => {
              const anterior = arr[i + 1];
              const variacao = anterior ? p.totalEntrevistas - anterior.totalEntrevistas : null;
              return (
                <tr key={p.timestamp} className={`border-b last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                  <td className="px-4 py-2.5">{p.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{p.totalEntrevistas}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {variacao !== null ? (variacao > 0 ? `+${variacao}` : variacao) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
