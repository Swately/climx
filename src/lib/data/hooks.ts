// Typed data hooks — the ONLY doorway pages/components use to reach data.
// Every forecast access is composite-keyed (wall W1).
import { useFetch, type FetchState } from './useFetch';
import type { EstadoRow, IndexRow, Meta, MunicipioForecast } from './types';

export function useForecast(
  ides: string,
  idmun: string,
  retryToken = 0,
): FetchState<MunicipioForecast> {
  return useFetch<MunicipioForecast>(`data/forecast/${ides}/${idmun}.json`, retryToken);
}

export function useMeta(): FetchState<Meta> {
  return useFetch<Meta>('data/meta.json');
}

export function useMunicipioIndex(): FetchState<IndexRow[]> {
  return useFetch<IndexRow[]>('data/index/all-lite.json');
}

export function useEstados(): FetchState<EstadoRow[]> {
  return useFetch<EstadoRow[]>('data/index/estados.json');
}

// Made with my soul - Swately <3
