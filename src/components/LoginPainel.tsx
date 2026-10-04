import { useState } from 'react';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RodapeParceria from '@/components/RodapeParceria';
import metadataIcon from '@/assets/metadata-icon.png';

interface LoginPainelProps {
  onEntrar: () => void;
}

export default function LoginPainel({ onEntrar }: LoginPainelProps) {
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviando || !senha) return;

    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch('/api/painel-sessao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      });
      const dados = await res.json();
      if (!res.ok) {
        setErro(dados?.erro || `Não foi possível entrar (HTTP ${res.status}).`);
        setSenha('');
        return;
      }
      onEntrar();
    } catch {
      setErro('Falha de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <form onSubmit={enviar} className="w-full max-w-sm space-y-5">
          <div className="text-center space-y-3">
            <img src={metadataIcon} alt="" className="h-12 mx-auto object-contain" />
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Enquetes 98FM — Eleições 2026
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Painel da redação. Informe a senha para continuar.
              </p>
            </div>
          </div>

          <div className="stat-card space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="senha-painel">Senha</Label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="senha-painel"
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className="pl-9"
                  autoFocus
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {erro && (
              <p className="text-xs text-destructive flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-px flex-shrink-0" aria-hidden="true" />
                {erro}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={enviando || !senha}>
              {enviando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            A senha protege o painel. As enquetes já publicadas no 98fmnatal.com.br continuam abertas aos
            ouvintes normalmente.
          </p>
        </form>
      </div>

      <RodapeParceria />
    </div>
  );
}
