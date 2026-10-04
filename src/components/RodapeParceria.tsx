import metadataLogo from '@/assets/metadata-logo-new.png';
import logoDial from '@/assets/logo-grupo-dial-natal.png';
import logo98fm from '@/assets/logo-98fm.png';
import logoJovemPan from '@/assets/logo-jovempan.png';
import { cn } from '@/lib/utils';

/*
 * Assinatura usada no rodapé do painel e no pé da enquete incorporada — é o
 * mesmo componente nos dois lugares para que as marcas nunca saiam de sincronia.
 *
 * As alturas são diferentes por logo de propósito: as marcas em lettering
 * (Metadata, Grupo Dial) pedem altura menor que os símbolos (98, Jovem Pan)
 * para que todas pesem igual na linha.
 */
interface RodapeParceriaProps {
  /** Versão reduzida, para caber no pé da enquete dentro da matéria. */
  compacto?: boolean;
}

export default function RodapeParceria({ compacto = false }: RodapeParceriaProps) {
  const alturas = compacto
    ? { metadata: 'h-4', dial: 'h-3', fm98: 'h-7', jovemPan: 'h-5' }
    : { metadata: 'h-5', dial: 'h-4', fm98: 'h-9', jovemPan: 'h-7' };

  const conteudo = (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center',
        compacto ? 'gap-x-3 gap-y-2' : 'gap-x-5 gap-y-4',
      )}
    >
      <div className={cn('flex items-center', compacto ? 'gap-2' : 'gap-3')}>
        <span
          className={cn('text-muted-foreground whitespace-nowrap', compacto ? 'text-[10px]' : 'text-xs')}
        >
          Desenvolvido por
        </span>
        <img src={metadataLogo} alt="Metadata" className={cn(alturas.metadata, 'w-auto object-contain')} />
      </div>

      <span className="hidden sm:block w-1 h-1 rounded-full bg-border" aria-hidden="true" />

      <div className={cn('flex items-center', compacto ? 'gap-3' : 'gap-4 sm:gap-5')}>
        <span
          className={cn('text-muted-foreground whitespace-nowrap', compacto ? 'text-[10px]' : 'text-xs')}
        >
          Em parceria com
        </span>
        <img src={logoDial} alt="Grupo Dial Natal" className={cn(alturas.dial, 'w-auto object-contain')} />
        <img src={logo98fm} alt="98FM Natal" className={cn(alturas.fm98, 'w-auto object-contain')} />
        <img src={logoJovemPan} alt="Jovem Pan" className={cn(alturas.jovemPan, 'w-auto object-contain')} />
      </div>
    </div>
  );

  if (compacto) {
    return <div className="border-t px-4 py-3 sm:px-5">{conteudo}</div>;
  }

  return (
    <footer className="border-t bg-card mt-10">
      <div className="max-w-[1600px] mx-auto px-4 py-5 sm:px-6">{conteudo}</div>
    </footer>
  );
}
