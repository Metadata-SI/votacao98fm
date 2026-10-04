import { useCallback, useEffect, useState } from 'react';

interface EstadoSessao {
  autenticado: boolean;
  senhaConfigurada: boolean;
}

/*
 * Estado de login do painel. Quem decide é sempre o servidor: a página só
 * pergunta "esta sessão vale?" e obedece. O cookie é HttpOnly, então este
 * código não consegue (nem precisa) lê-lo.
 */
export function usePainelSessao() {
  const [estado, setEstado] = useState<EstadoSessao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const verificar = useCallback(async () => {
    try {
      const res = await fetch('/api/painel-sessao', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEstado((await res.json()) as EstadoSessao);
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao verificar a sessão.');
      // Na dúvida, exige senha: é o lado seguro de errar.
      setEstado({ autenticado: false, senhaConfigurada: true });
    }
  }, []);

  useEffect(() => {
    verificar();
  }, [verificar]);

  const sair = useCallback(async () => {
    try {
      await fetch('/api/painel-sessao', { method: 'DELETE' });
    } finally {
      setEstado({ autenticado: false, senhaConfigurada: true });
      verificar();
    }
  }, [verificar]);

  return {
    carregando: estado === null,
    autenticado: estado?.autenticado ?? false,
    senhaConfigurada: estado?.senhaConfigurada ?? true,
    erro,
    revalidar: verificar,
    sair,
  };
}
