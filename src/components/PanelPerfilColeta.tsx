import { Users } from 'lucide-react';
import type { ResultadoPayload, QuotaRow, DemografiaChave } from '@/lib/coleta';
import { findDemografiaPergunta, buildQuotaComparison, IDADE_ORDER, ESCOLARIDADE_ORDER, RENDA_ORDER, STATUS_COTA_COLOR } from '@/lib/coleta';

const MONO_COLOR = '#326afd';

// Nomes de categoria de renda trazem a faixa em R$ entre parênteses — tira isso
// só na exibição (a chave completa ainda é usada para casar com a meta).
function nomeCurto(categoria: string): string {
  return categoria.replace(/\s*\(R\$[^)]*\)/, '');
}

function QuotaBar({ row }: { row: QuotaRow }) {
  const { categoria, realizadoCount, realizadoPct, metaPct, metaCount, diffPct, status } = row;
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium leading-snug" title={categoria}>{nomeCurto(categoria)}</span>
        <span className="text-sm font-semibold whitespace-nowrap flex-shrink-0">
          {realizadoPct.toFixed(2)}%
          {metaPct !== null && <span className="text-xs font-normal text-muted-foreground"> / meta {metaPct.toFixed(2)}%</span>}
        </span>
      </div>
      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden mt-1.5">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(realizadoPct, 100)}%`, backgroundColor: MONO_COLOR }}
        />
        {metaPct !== null && (
          <div
            className="absolute top-0 h-full w-[2px] bg-foreground/70"
            style={{ left: `${Math.min(metaPct, 100)}%` }}
            title={`Meta: ${metaPct.toFixed(2)}%`}
          />
        )}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {metaCount !== null ? `${realizadoCount}/${metaCount} entrevistas` : `${realizadoCount} entrevista${realizadoCount === 1 ? '' : 's'}`}
        </span>
        {diffPct !== null ? (
          <span className="text-xs font-semibold whitespace-nowrap" style={{ color: STATUS_COTA_COLOR[status] }}>
            {status === 'dentro da meta' ? 'na meta' : `${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1)} p.p.`}
          </span>
        ) : <span />}
      </div>
      {row.faltamBruto !== null && row.faltamBruto !== 0 && (
        <p
          className="text-xs mt-1.5 font-semibold"
          style={{ color: row.faltamBruto > 0 ? STATUS_COTA_COLOR['abaixo da meta'] : STATUS_COTA_COLOR['acima da meta'] }}
        >
          {row.faltamBruto > 0
            ? `Faltam ${row.faltamBruto} entrevista${row.faltamBruto === 1 ? '' : 's'} dessa faixa`
            : `${-row.faltamBruto} entrevista${-row.faltamBruto === 1 ? '' : 's'} acima da meta dessa faixa`}
        </p>
      )}
    </div>
  );
}

function QuotaSection({ title, nota, base, rows }: { title: string; nota?: string; base: number; rows: QuotaRow[] }) {
  const semDados = rows.length === 0 || rows.every(r => r.realizadoCount === 0);
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-foreground">
          {title}
          {nota && <span className="text-xs font-normal text-muted-foreground"> ({nota})</span>}
        </p>
        <span className="text-xs text-muted-foreground">Base: {base.toLocaleString('pt-BR')}</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-3">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MONO_COLOR }} /> Realizado
        <span className="inline-block w-[2px] h-2.5 bg-foreground/70 ml-2" /> Meta
      </div>
      {semDados ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Sem dados ainda.</p>
      ) : (
        <div className="divide-y">
          {rows.map(row => <QuotaBar key={row.categoria} row={row} />)}
        </div>
      )}
    </div>
  );
}

const DEMOGRAFIA_CONFIG: Array<{ chave: DemografiaChave; titulo: string; nota?: string; order?: string[] }> = [
  { chave: 'idade', titulo: 'Idade', order: IDADE_ORDER },
  { chave: 'sexo', titulo: 'Gênero' },
  { chave: 'escolaridade', titulo: 'Grau de Instrução', nota: 'controle flexível', order: ESCOLARIDADE_ORDER },
  { chave: 'renda', titulo: 'Renda Familiar', nota: 'referência, sem cota rígida', order: RENDA_ORDER },
];

export default function PanelPerfilColeta({ payload }: { payload: ResultadoPayload | null }) {
  const perguntas = payload?.perguntas ?? [];
  const total = payload?.totalEntrevistas ?? 0;

  return (
    <div className="space-y-6">
      <h2 className="panel-title flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" aria-hidden="true" />
        Acompanhamento Geral por Perfil
      </h2>
      <p className="text-sm text-muted-foreground">
        Percentual realizado comparado à meta de cada categoria (total entrevistado até agora: <strong>{total}</strong>).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEMOGRAFIA_CONFIG.map(({ chave, titulo, nota, order }) => {
          const pergunta = findDemografiaPergunta(perguntas, chave);
          const rows = buildQuotaComparison(pergunta?.respostas ?? [], chave, order);
          return <QuotaSection key={chave} title={titulo} nota={nota} base={total} rows={rows} />;
        })}
      </div>
    </div>
  );
}
