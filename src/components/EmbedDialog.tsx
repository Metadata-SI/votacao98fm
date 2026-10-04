import { useEffect, useMemo, useState } from 'react';
import { Check, Code2, Copy, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import {
  OPCOES_EMBED_PADRAO,
  gerarCodigoEmbed,
  gerarCodigoEmbedSimples,
  urlEnquete,
  type OpcoesEmbed,
} from '@/lib/embed';
import type { CargoMeta } from '@/lib/enquete';

interface EmbedDialogProps {
  meta: CargoMeta | null;
  aberto: boolean;
  onFechar: () => void;
}

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // clipboard API exige HTTPS/permissão — cai para o caminho antigo
    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

function BlocoCodigo({ codigo, rotulo }: { codigo: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const id = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(id);
  }, [copiado]);

  async function aoCopiar() {
    const ok = await copiar(codigo);
    if (ok) {
      setCopiado(true);
      toast.success(`${rotulo} copiado`, { description: 'Cole no editor de HTML da matéria.' });
    } else {
      toast.error('Não foi possível copiar', { description: 'Selecione o código e copie manualmente.' });
    }
  }

  return (
    <div className="relative">
      <pre className="bg-muted/60 border rounded-lg p-3 pr-12 text-[11px] leading-relaxed overflow-x-auto max-h-64 font-mono text-foreground">
        <code>{codigo}</code>
      </pre>
      <Button
        size="icon"
        variant="secondary"
        className="absolute top-2 right-2 h-8 w-8"
        onClick={aoCopiar}
        aria-label={`Copiar ${rotulo}`}
      >
        {copiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

export default function EmbedDialog({ meta, aberto, onFechar }: EmbedDialogProps) {
  const [opcoes, setOpcoes] = useState<OpcoesEmbed>(() => ({
    ...OPCOES_EMBED_PADRAO,
    origem: typeof window !== 'undefined' ? window.location.origin : '',
  }));

  // Se a pessoa abrir o painel por outro domínio depois, a origem acompanha.
  useEffect(() => {
    if (!aberto || typeof window === 'undefined') return;
    setOpcoes(atual => (atual.origem ? atual : { ...atual, origem: window.location.origin }));
  }, [aberto]);

  const codigoCompleto = useMemo(
    () => (meta ? gerarCodigoEmbed(meta.slug, opcoes) : ''),
    [meta, opcoes],
  );
  const codigoSimples = useMemo(
    () => (meta ? gerarCodigoEmbedSimples(meta.slug, opcoes) : ''),
    [meta, opcoes],
  );
  const url = meta ? urlEnquete(meta.slug, opcoes) : '';

  if (!meta) return null;

  return (
    <Dialog open={aberto} onOpenChange={valor => !valor && onFechar()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5" style={{ color: meta.cor }} aria-hidden="true" />
            Incorporar enquete — {meta.titulo}
          </DialogTitle>
          <DialogDescription>
            Cole o código no editor de HTML da matéria no 98fmnatal.com.br. A enquete carrega dentro de um
            iframe, isolada do CSS do site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Opções */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="embed-origem">Endereço onde o painel está publicado</Label>
              <Input
                id="embed-origem"
                value={opcoes.origem}
                onChange={e => setOpcoes({ ...opcoes, origem: e.target.value })}
                placeholder="https://enquetes.98fmnatal.com.br"
              />
              <p className="text-[11px] text-muted-foreground">
                Precisa ser o domínio público deste painel — é de lá que o iframe carrega a enquete.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="embed-largura">Largura máxima (px)</Label>
              <Input
                id="embed-largura"
                type="number"
                min={0}
                step={10}
                value={opcoes.larguraMaxima}
                onChange={e => setOpcoes({ ...opcoes, larguraMaxima: Number(e.target.value) || 0 })}
              />
              <p className="text-[11px] text-muted-foreground">0 = ocupar toda a largura disponível.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="embed-tema">Tema</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch
                  id="embed-tema"
                  checked={opcoes.tema === 'escuro'}
                  onCheckedChange={valor => setOpcoes({ ...opcoes, tema: valor ? 'escuro' : 'claro' })}
                />
                <span className="text-sm text-foreground">
                  {opcoes.tema === 'escuro' ? 'Escuro' : 'Claro'}
                </span>
              </div>
            </div>

            <label className="flex items-start gap-3 sm:col-span-2 cursor-pointer">
              <Switch
                checked={opcoes.mostrarResultado}
                onCheckedChange={valor => setOpcoes({ ...opcoes, mostrarResultado: valor })}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  Mostrar resultado parcial depois do voto
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Desligue quando a redação não quiser expor a parcial durante a votação.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 sm:col-span-2 cursor-pointer">
              <Switch
                checked={opcoes.alturaAutomatica}
                onCheckedChange={valor => setOpcoes({ ...opcoes, alturaAutomatica: valor })}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Ajustar a altura automaticamente</span>
                <span className="block text-[11px] text-muted-foreground">
                  Inclui um trecho de script que redimensiona o iframe conforme a enquete muda de passo.
                </span>
              </span>
            </label>
          </div>

          {/* Código */}
          <Tabs defaultValue="completo">
            <TabsList className="w-full">
              <TabsTrigger value="completo" className="flex-1">
                Código recomendado
              </TabsTrigger>
              <TabsTrigger value="simples" className="flex-1">
                Só o iframe
              </TabsTrigger>
            </TabsList>

            <TabsContent value="completo" className="space-y-2 mt-3">
              <BlocoCodigo codigo={codigoCompleto} rotulo="Código" />
              <p className="text-[11px] text-muted-foreground">
                Ajusta a altura sozinho. Use sempre que o CMS aceitar bloco de HTML com script.
              </p>
            </TabsContent>

            <TabsContent value="simples" className="space-y-2 mt-3">
              <BlocoCodigo codigo={codigoSimples} rotulo="Iframe" />
              <p className="text-[11px] text-muted-foreground">
                Uma linha, sem script, com altura fixa. Para CMS que remove <code>&lt;script&gt;</code> do corpo
                da matéria.
              </p>
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
            <Button variant="outline" size="sm" asChild className="mt-3">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
                Abrir a enquete em uma aba
              </a>
            </Button>
            <p className="text-[11px] text-muted-foreground mt-3 font-mono break-all">{url}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
