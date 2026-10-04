import { useState } from 'react';
import { Code2, Eye, Users, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EnqueteWidget from '@/components/EnqueteWidget';
import RodapeParceria from '@/components/RodapeParceria';
import { useResultadoEnquete } from '@/hooks/useCandidatos';
import { formatarNumero, type CargoCandidatos, type CargoMeta } from '@/lib/enquete';

interface CargoCardProps {
  meta: CargoMeta;
  dados: CargoCandidatos | null;
  carregando: boolean;
  onIncorporar: () => void;
}

/** Fileira de fotos dos primeiros candidatos — dá rosto ao card sem ocupar espaço. */
function FilaDeFotos({ dados, cor }: { dados: CargoCandidatos; cor: string }) {
  const amostra = dados.candidatos.slice(0, 7);
  const resto = dados.candidatos.length - amostra.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {amostra.map((candidato, indice) => (
          <img
            key={candidato.id}
            src={candidato.foto}
            alt=""
            loading="lazy"
            title={`${candidato.numero} · ${candidato.nome} (${candidato.partido})`}
            onError={event => {
              (event.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
            className="w-8 h-8 rounded-full object-cover bg-muted ring-2 ring-card"
            style={{ marginLeft: indice === 0 ? 0 : -8, zIndex: amostra.length - indice }}
          />
        ))}
      </div>
      {resto > 0 && <span className="text-xs text-muted-foreground">+{resto}</span>}
    </div>
  );
}

export default function CargoCard({ meta, dados, carregando, onIncorporar }: CargoCardProps) {
  const [previaAberta, setPreviaAberta] = useState(false);
  const { data: apuracao } = useResultadoEnquete(meta.slug);

  const total = dados?.candidatos.length ?? 0;

  return (
    <>
      <div className="stat-card flex flex-col gap-4 hover:shadow-md">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.cor }} />
              <h3 className="font-semibold text-foreground tracking-tight truncate">{meta.titulo}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{meta.descricao}</p>
          </div>

          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0"
            style={{ color: meta.cor, backgroundColor: `color-mix(in srgb, ${meta.cor} 12%, transparent)` }}
          >
            {meta.votos > 1 ? `${meta.votos} votos` : '1 voto'}
          </span>
        </div>

        {/* Números */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
              Candidatos
            </p>
            <p className="text-2xl font-bold leading-none tabular-nums" style={{ color: meta.cor }}>
              {carregando ? '—' : formatarNumero(total)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
              Participantes
            </p>
            <p className="text-2xl font-bold leading-none tabular-nums text-foreground">
              {apuracao ? formatarNumero(apuracao.totalParticipantes) : '—'}
            </p>
          </div>
        </div>

        {/* Amostra de candidatos */}
        {dados && total > 0 ? (
          <FilaDeFotos dados={dados} cor={meta.cor} />
        ) : (
          <div className="h-8 flex items-center">
            <p className="text-xs text-muted-foreground">
              {carregando ? 'Carregando candidatos...' : 'Lista indisponível'}
            </p>
          </div>
        )}

        {/* Rodapé */}
        <div className="mt-auto space-y-3 pt-1">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" aria-hidden="true" />
              {meta.abrangencia}
            </span>
            {dados && (
              <span className="flex items-center gap-1">
                <Vote className="w-3 h-3" aria-hidden="true" />
                {dados.vagas} {dados.vagas === 1 ? 'vaga' : 'vagas'}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={onIncorporar} style={{ backgroundColor: meta.cor }}>
              <Code2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Incorporar
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPreviaAberta(true)} aria-label={`Pré-visualizar enquete de ${meta.titulo}`}>
              <Eye className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {/* Prévia: o mesmo widget que vai ao ar, mas sem gravar voto */}
      <Dialog open={previaAberta} onOpenChange={setPreviaAberta}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0">
          <DialogHeader className="p-5 pb-0">
            <DialogTitle>Prévia — {meta.titulo}</DialogTitle>
            <DialogDescription>
              É exatamente o que o leitor vê no site. Os votos dados aqui não são registrados.
            </DialogDescription>
          </DialogHeader>
          {previaAberta && (
            <>
              <EnqueteWidget meta={meta} somentePrevia mostrarResultado={false} />
              <RodapeParceria compacto />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
