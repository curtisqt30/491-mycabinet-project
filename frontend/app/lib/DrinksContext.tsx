import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { getRandomDrinks } from './cocktails';

// Base drink type without favorite status for context storage
export type BaseDrink = {
  id: string;
  name: string;
  thumbUrl: string | null;
};

type DrinksContextType = {
  /** Cached drinks for the session */
  drinks: BaseDrink[];
  /** True while fetching drinks */
  loading: boolean;
  /** True after first successful fetch */
  initialized: boolean;
  /** Fetch fresh random drinks (call on pull-to-refresh) */
  refreshDrinks: () => Promise<void>;
  /** Clear drinks and reset state (call on logout) */
  clearDrinks: () => void;
};

const DrinksContext = createContext<DrinksContextType | null>(null);

type Props = {
  children: React.ReactNode;
};

export function DrinksProvider({ children }: Props) {
  const [drinks, setDrinks] = useState<BaseDrink[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const refreshDrinks = useCallback(async () => {
    // Prevent concurrent fetches
    if (loading) return;

    setLoading(true);
    try {
      const randomDrinks = await getRandomDrinks(8);
      const mapped: BaseDrink[] = randomDrinks.map((drink) => ({
        id: drink.idDrink,
        name: drink.strDrink,
        thumbUrl: drink.strDrinkThumb ?? null,
      }));
      setDrinks(mapped);
      setInitialized(true);
    } catch (error) {
      console.error('DrinksContext: Failed to fetch random drinks:', error);
      // Keep existing drinks on error, but mark as initialized to prevent infinite retries
      if (!initialized) {
        setInitialized(true);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, initialized]);

  const clearDrinks = useCallback(() => {
    setDrinks([]);
    setInitialized(false);
    setLoading(false);
  }, []);

  const value = useMemo<DrinksContextType>(
    () => ({
      drinks,
      loading,
      initialized,
      refreshDrinks,
      clearDrinks,
    }),
    [drinks, loading, initialized, refreshDrinks, clearDrinks],
  );

  return (
    <DrinksContext.Provider value={value}>{children}</DrinksContext.Provider>
  );
}

/**
 * Hook to access session-cached drinks.
 *
 * Usage:
 * ```tsx
 * const { drinks, loading, initialized, refreshDrinks } = useDrinks();
 *
 * useEffect(() => {
 *   if (!initialized) refreshDrinks();
 * }, [initialized, refreshDrinks]);
 * ```
 */
export function useDrinks(): DrinksContextType {
  const context = useContext(DrinksContext);
  if (!context) {
    throw new Error('useDrinks must be used within a DrinksProvider');
  }
  return context;
}