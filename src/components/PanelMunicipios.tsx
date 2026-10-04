import { useMemo, useState } from 'react';
import { Download, Map } from 'lucide-react';
import { MunicipioColeta, StatusMunicipio, STATUS_COLOR, STATUS_LABEL, toCsv, downloadCsv } from '@/lib/coleta';

const STATUS_OPTIONS: StatusMunicipio[] = ['não iniciado', 'em andamento', 'concluído', 'excedente'];

type OrdenarPor = 'alfabetica' | 'percentual-asc' | 'percentual-desc' | 'restante-desc' | 'restante-asc' | 'realizado-desc';

// Compara valores que podem ser nulos (sem meta definida) — nulos sempre vão para o final,
// independente da direção escolhida.
function compararComNulos(a: number | null, b: number | null, decrescente: boolean): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return decrescente ? b - a : a - b;
}

// Prioridade de status: em andamento primeiro, depois excedente, concluído e, por fim,
// não iniciado. O critério escolhido no dropdown só desempata dentro de cada grupo.
const STATUS_ORDEM: Record<StatusMunicipio, number> = {
  'em andamento': 0,
  'excedente': 1,
  'concluído': 2,
  'não iniciado': 3,
};

export default function PanelMunicipios({ municipios }: { municipios: MunicipioColeta[] }) {
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusMunicipio[]>([]);
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>('alfabetica');

  const filtrados = useMemo(() => {
    let rows = municipios;
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      rows = rows.filter(m => m.nome.toLowerCase().includes(q));
    }
    if (statusFiltro.length > 0) {
      rows = rows.filter(m => statusFiltro.includes(m.status));
    }
    rows = [...rows].sort((a, b) => {
      const statusDiff = STATUS_ORDEM[a.status] - STATUS_ORDEM[b.status];
      if (statusDiff !== 0) return statusDiff;
      switch (ordenarPor) {
        case 'percentual-asc': return compararComNulos(a.percentualMeta, b.percentualMeta, false);
        case 'percentual-desc': return compararComNulos(a.percentualMeta, b.percentualMeta, true);
        case 'restante-asc': return compararComNulos(a.pendente, b.pendente, false);
        case 'restante-desc': return compararComNulos(a.pendente, b.pendente, true);
        case 'realizado-desc': return b.realizado - a.realizado;
        case 'alfabetica':
        default:
          return a.nome.localeCompare(b.nome, 'pt-BR');
      }
    });
    return rows;
  }, [municipios, busca, statusFiltro, ordenarPor]);

  const toggleStatus = (s: StatusMunicipio) => {
    setStatusFiltro(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title flex items-center gap-2">
          <Map className="w-5 h-5 text-primary" aria-hidden="true" />
          Coleta por Município
        </h2>
        <button
          onClick={() => downloadCsv(`coleta-municipios-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(filtrados))}
          className="flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity"
        >
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>

      <div className="stat-card flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar município..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="flex-1 min-w-[180px] bg-muted/50 border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`filter-badge ${statusFiltro.includes(s) ? 'filter-badge-active' : 'filter-badge-inactive'}`}
              style={statusFiltro.includes(s) ? { backgroundColor: STATUS_COLOR[s] } : undefined}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <select
          value={ordenarPor}
          onChange={e => setOrdenarPor(e.target.value as OrdenarPor)}
          className="bg-muted/50 border rounded-md px-2 py-1.5 text-xs outline-none"
        >
          <option value="alfabetica">Ordem alfabética</option>
          <option value="percentual-asc">Menor percentual primeiro</option>
          <option value="percentual-desc">Maior percentual primeiro</option>
          <option value="restante-desc">Maior quantidade restante</option>
          <option value="restante-asc">Menor quantidade restante</option>
          <option value="realizado-desc">Maior quantidade realizada</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filtrados.length} de {municipios.length} municípios</span>
      </div>

      <div className="stat-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 sm:px-4 py-3 font-semibold whitespace-nowrap">Município</th>
              <th className="px-3 sm:px-4 py-3 font-semibold text-right whitespace-nowrap">Meta</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Realizado</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Pendente</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Excedente</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">% do total</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Progresso da meta</th>
              <th className="px-3 sm:px-4 py-3 font-semibold whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((m, i) => (
              <tr key={m.nome} className={`border-b last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                <td className="px-3 sm:px-4 py-2.5 font-medium whitespace-nowrap">{m.nome}</td>
                <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">{m.meta ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">{m.realizado}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${m.pendente ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>{m.pendente ?? '—'}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${m.excedente ? 'text-blue-600 font-semibold' : 'text-muted-foreground'}`}>{m.excedente ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">{m.percentualDoTotal.toFixed(1)}%</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {m.percentualMeta !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 sm:w-20 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, m.percentualMeta)}%`, backgroundColor: STATUS_COLOR[m.status] }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">{m.percentualMeta.toFixed(0)}%</span>
                    </div>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap">
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: STATUS_COLOR[m.status], backgroundColor: `${STATUS_COLOR[m.status]}20` }}>
                    {STATUS_LABEL[m.status]}
                  </span>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">Nenhum município encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
