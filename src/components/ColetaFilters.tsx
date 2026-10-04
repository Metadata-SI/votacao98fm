import { RefreshCw } from 'lucide-react';
import type { MunicipioColeta } from '@/lib/coleta';

interface ColetaFiltersProps {
  municipios: MunicipioColeta[];
  atualizarAgora: () => void;
  refreshing: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  error: string | null;
}

export default function ColetaFilters({
  municipios, atualizarAgora, refreshing, autoRefresh, setAutoRefresh, error,
}: ColetaFiltersProps) {
  const comEntrevistas = municipios.filter(m => m.realizado > 0).length;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full whitespace-nowrap">
        {comEntrevistas} / {municipios.length} municípios
      </span>

      <button
        onClick={atualizarAgora}
        disabled={refreshing}
        className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-60 whitespace-nowrap"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? 'Atualizando...' : 'Atualizar agora'}
      </button>

      <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer whitespace-nowrap">
        Atualização automática (60s)
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={e => setAutoRefresh(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
      </label>

      {error && <p className="text-xs text-destructive whitespace-nowrap">{error}</p>}
    </div>
  );
}
