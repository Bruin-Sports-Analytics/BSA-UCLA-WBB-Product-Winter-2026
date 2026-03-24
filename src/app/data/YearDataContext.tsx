import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { fetchYearData } from './transferData';
import type { TransferPlayer } from './transferData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface YearDataContextValue {
  cache: Map<number, TransferPlayer[]>;
  loadYear: (year: number) => Promise<void>;
  loadingYears: Set<number>;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const YearDataContext = createContext<YearDataContextValue | null>(null);

export function useYearDataContext(): YearDataContextValue {
  const ctx = useContext(YearDataContext);
  if (!ctx) throw new Error('useYearDataContext must be used inside YearDataProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function YearDataProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Map<number, TransferPlayer[]>>(new Map());
  const [loadingYears, setLoadingYears] = useState<Set<number>>(new Set());
  const [error, setError] = useState<Error | null>(null);
  // cacheRef mirrors the cache state so loadYear can read it without
  // having cache as a dependency (which would cause infinite re-renders).
  const cacheRef = useRef<Map<number, TransferPlayer[]>>(new Map());
  // inFlight prevents duplicate fetches in React StrictMode double-invoke.
  const inFlight = useRef<Set<number>>(new Set());

  // Keep cacheRef in sync with cache state.
  cacheRef.current = cache;

  // loadYear is stable (empty deps) because it reads cacheRef, not cache state.
  // Order: check cacheRef first, then inFlight, then fetch.
  const loadYear = useCallback(async (year: number): Promise<void> => {
    if (cacheRef.current.has(year) || inFlight.current.has(year)) return;

    inFlight.current.add(year);
    setLoadingYears(prev => new Set(prev).add(year));

    try {
      const players = await fetchYearData(year);
      cacheRef.current.set(year, players); // keep ref in sync immediately
      setCache(prev => new Map(prev).set(year, players));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      inFlight.current.delete(year);
      setLoadingYears(prev => {
        const next = new Set(prev);
        next.delete(year);
        return next;
      });
    }
  }, []); // stable — reads refs, not state

  return (
    <YearDataContext.Provider value={{ cache, loadYear, loadingYears, error }}>
      {children}
    </YearDataContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useYearData(year: number): {
  players: TransferPlayer[];
  isLoading: boolean;
  error: Error | null;
} {
  const { cache, loadYear, loadingYears, error } = useYearDataContext();

  useEffect(() => {
    loadYear(year);
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    players: cache.get(year) ?? [],
    isLoading: loadingYears.has(year),
    error,
  };
}
