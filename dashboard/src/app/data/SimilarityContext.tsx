import { createContext, useContext, useEffect, useState } from 'react';
import type { SimilarityIndex } from './similarityTypes';

interface SimilarityContextValue {
  index: SimilarityIndex | null;
  isLoading: boolean;
  error: Error | null;
}

const SimilarityContext = createContext<SimilarityContextValue>({
  index: null,
  isLoading: true,
  error: null,
});

export function useSimilarity(): SimilarityContextValue {
  return useContext(SimilarityContext);
}

export function SimilarityProvider({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState<SimilarityIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch('/data/similarity_index.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        setIndex(JSON.parse(text));
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <SimilarityContext.Provider value={{ index, isLoading, error }}>
      {children}
    </SimilarityContext.Provider>
  );
}
