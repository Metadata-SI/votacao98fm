import { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { AlertCircle } from 'lucide-react';
import EnqueteWidget from '@/components/EnqueteWidget';
import RodapeParceria from '@/components/RodapeParceria';
import { publicarAltura } from '@/lib/embed';
import { metaDoCargo } from '@/lib/enquete';

/*
 * Página servida dentro do iframe no 98fmnatal.com.br.
 *
 * Fica sem cabeçalho e sem menu de propósito: quem dá o contexto é a matéria que
 * hospeda a enquete. Leva só a assinatura das marcas no pé.
 *
 * A medição de altura vive aqui, e não no widget, porque o que o site
 * hospedeiro precisa redimensionar é a página inteira — widget mais rodapé.
 * Medindo só o widget, o rodapé ficaria cortado pelo iframe.
 *
 * Parâmetros aceitos:
 *   ?tema=escuro    -> paleta escura, para matéria com fundo escuro
 *   ?resultado=0    -> não mostrar a parcial depois do voto
 */
export default function Enquete() {
  const { cargo } = useParams<{ cargo: string }>();
  const [params] = useSearchParams();
  const { setTheme } = useTheme();

  const meta = metaDoCargo(cargo);
  const tema = params.get('tema') === 'escuro' ? 'dark' : 'light';
  const mostrarResultado = params.get('resultado') !== '0';

  useEffect(() => {
    setTheme(tema);
  }, [setTheme, tema]);

  // Dentro do iframe o fundo precisa ser opaco, senão aparece o fundo do site
  // da rádio por baixo e o contraste do texto quebra.
  useEffect(() => {
    const anterior = document.body.style.background;
    document.body.style.background = 'hsl(var(--background))';
    return () => {
      document.body.style.background = anterior;
    };
  }, []);

  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elemento = raiz.current;
    if (!elemento) return;
    const publicar = () => publicarAltura(elemento.getBoundingClientRect().height);
    publicar();
    const observer = new ResizeObserver(publicar);
    observer.observe(elemento);
    return () => observer.disconnect();
  }, []);

  if (!meta) {
    return (
      <div ref={raiz} className="min-h-[240px] flex items-center justify-center p-6 bg-background">
        <div className="text-center space-y-2 max-w-sm">
          <AlertCircle className="w-7 h-7 mx-auto text-destructive" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">Enquete não encontrada</p>
          <p className="text-xs text-muted-foreground">
            O cargo “{cargo}” não existe. Gere o código novamente no painel de enquetes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={raiz} className="bg-background">
      <EnqueteWidget meta={meta} mostrarResultado={mostrarResultado} />
      <RodapeParceria compacto />
    </div>
  );
}
