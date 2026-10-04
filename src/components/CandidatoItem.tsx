import { useState } from 'react';
import { Check, User } from 'lucide-react';
import type { Candidato } from '@/lib/enquete';
import { cn } from '@/lib/utils';

/** Rótulos dos vinculados conforme o `tp` que o TSE manda. */
const ROTULO_VINCULADO: Record<string, string> = {
  v: 'Vice',
  s1: '1º suplente',
  s2: '2º suplente',
};

function Foto({ candidato }: { candidato: Candidato }) {
  const [falhou, setFalhou] = useState(false);

  if (falhou) {
    return (
      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
        <User className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={candidato.foto}
      alt=""
      loading="lazy"
      onError={() => setFalhou(true)}
      className="w-12 h-12 rounded-md object-cover bg-muted flex-shrink-0"
    />
  );
}

interface CandidatoItemProps {
  candidato: Candidato;
  selecionado: boolean;
  /** Texto do selo quando selecionado — "1º voto"/"2º voto" no Senado. */
  rotuloSelecao?: string;
  /** Mostra vice/suplentes. Desligado nas listas longas de deputado. */
  mostrarVinculados?: boolean;
  desabilitado?: boolean;
  cor: string;
  onSelecionar: () => void;
}

export default function CandidatoItem({
  candidato,
  selecionado,
  rotuloSelecao,
  mostrarVinculados = true,
  desabilitado = false,
  cor,
  onSelecionar,
}: CandidatoItemProps) {
  const vinculados = candidato.vices.filter(v => v.nome);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selecionado}
      disabled={desabilitado}
      onClick={onSelecionar}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selecionado ? 'border-transparent shadow-sm' : 'bg-card hover:border-primary/40 hover:bg-primary/[0.03]',
        desabilitado && !selecionado && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-card',
      )}
      style={selecionado ? { backgroundColor: `color-mix(in srgb, ${cor} 10%, transparent)`, boxShadow: `inset 0 0 0 2px ${cor}` } : undefined}
    >
      <Foto candidato={candidato} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-bold tabular-nums" style={{ color: cor }}>
            {candidato.numero}
          </span>
          <span className="font-semibold text-sm text-foreground leading-tight">{candidato.nome}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {candidato.partido}
          {candidato.coligacao && <span className="hidden sm:inline"> · {candidato.coligacao}</span>}
        </p>
        {mostrarVinculados && vinculados.length > 0 && (
          <p className="text-[11px] text-muted-foreground/80 mt-1 leading-snug">
            {vinculados
              .map(v => `${ROTULO_VINCULADO[v.tipo ?? ''] ?? 'Vinculado'}: ${v.nome}`)
              .join(' · ')}
          </p>
        )}
      </div>

      <div className="flex-shrink-0">
        {selecionado ? (
          <span
            className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full text-white whitespace-nowrap"
            style={{ backgroundColor: cor }}
          >
            <Check className="w-3 h-3" aria-hidden="true" />
            {rotuloSelecao ?? 'Escolhido'}
          </span>
        ) : (
          <span className="block w-5 h-5 rounded-full border-2 border-border" aria-hidden="true" />
        )}
      </div>
    </button>
  );
}
