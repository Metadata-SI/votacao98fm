import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResultadoPayload } from '@/lib/coleta';

export const AUTO_REFRESH_MS = 60 * 1000; // 60 segundos
const HISTORICO_KEY = 'acompanhamento-coleta:historico';
const HISTORICO_MAX_PONTOS = 500;

export interface PontoHistorico {
  timestamp: string; // ISO
  totalEntrevistas: number;
}

function carregarHistorico(): PontoHistorico[] {
  try {
    const raw = localStorage.getItem(HISTORICO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function salvarHistorico(pontos: PontoHistorico[]) {
  try {
    localStorage.setItem(HISTORICO_KEY, JSON.stringify(pontos.slice(-HISTORICO_MAX_PONTOS)));
  } catch {
    // localStorage indisponível (modo privado etc.) — histórico simplesmente não persiste
  }
}

export function useColeta() {
  const [payload, setPayload] = useState<ResultadoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimaVerificacao, setUltimaVerificacao] = useState<Date | null>(null);
  const [historico, setHistorico] = useState<PontoHistorico[]>(() => carregarHistorico());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buscar = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/resultado', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.erro || `HTTP ${res.status}`);

      setPayload(data as ResultadoPayload);
      setError(null);
      setUltimaVerificacao(new Date());

      setHistorico(prev => {
        const ponto: PontoHistorico = { timestamp: new Date().toISOString(), totalEntrevistas: data.totalEntrevistas };
        const last = prev[prev.length - 1];
        // evita duplicar pontos idênticos consecutivos
        if (last && last.totalEntrevistas === ponto.totalEntrevistas) return prev;
        const next = [...prev, ponto];
        salvarHistorico(next);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    buscar();
  }, [buscar]);

  useEffect(() => {
    if (!autoRefresh) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => buscar(), AUTO_REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, buscar]);

  return {
    payload,
    loading,
    refreshing,
    error,
    ultimaVerificacao,
    historico,
    autoRefresh,
    setAutoRefresh,
    atualizarAgora: () => buscar(true),
  };
}
