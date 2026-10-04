import { useQuery } from '@tanstack/react-query';
import { buscarCandidatos, buscarResultadoEnquete, type CargoSlug } from '@/lib/enquete';

/** Lista de candidatos de todos os cargos — usada pelo painel. */
export function useCandidatos() {
  return useQuery({
    queryKey: ['candidatos'],
    queryFn: () => buscarCandidatos(),
    staleTime: 10 * 60 * 1000, // a lista do TSE é praticamente estática
    retry: 1,
  });
}

/** Lista de um cargo só — usada pela enquete incorporada. */
export function useCandidatosDoCargo(cargo: CargoSlug | null) {
  return useQuery({
    queryKey: ['candidatos', cargo],
    queryFn: () => buscarCandidatos(cargo!),
    enabled: !!cargo,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Apuração da enquete. `ativo` deixa o painel buscar os totais de todos os
 * cargos de uma vez sem disparar consulta para enquete que não está na tela.
 */
export function useResultadoEnquete(cargo: CargoSlug, ativo = true) {
  return useQuery({
    queryKey: ['votos', cargo],
    queryFn: () => buscarResultadoEnquete(cargo),
    enabled: ativo,
    refetchInterval: 30 * 1000,
    staleTime: 10 * 1000,
    retry: 1,
  });
}
