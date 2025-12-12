import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  UIManager,
  Keyboard,
} from 'react-native';
import { Stack, router } from 'expo-router';
import {
  useSafeAreaInsets,
  SafeAreaView,
} from 'react-native-safe-area-context';
import MenuButton from '@/components/ui/MenuButton';
import NavigationDrawer from '@/components/ui/NavigationDrawer';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import type { Cocktail } from '../lib/cocktails';
import {
  searchByName,
  filterByIngredient,
  hydrateThumbs,
} from '../lib/cocktails';
import { useFavorites } from '@/app/lib/useFavorites';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Generic ingredient terms to ignore when searching by ingredient
const STOP_GENERIC = new Set([
  'gin',
  'rum',
  'vodka',
  'whiskey',
  'whisky',
  'tequila',
  'brandy',
  'bourbon',
  'scotch',
  'wine',
  'beer',
  'liqueur',
]);

// Normalize a string for matching
function norm(s?: string | null) {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '');
}

// Find index of needle in haystack at word boundary, or -1
function wordBoundaryIndex(hay: string, needle: string) {
  const rx = new RegExp(`\\b${needle}\\b`, 'i');
  const m = rx.exec(hay);
  return m ? m.index : -1;
}

type Rankable = Cocktail & { ingredientsNormalized?: string[] | null };

// Score a drink for relevance to the query
function scoreDrink(q: string, d: Rankable) {
  const nq = norm(q);
  const nname = norm(d.strDrink ?? '');
  let score = 0;

  // Name quality
  if (nname === nq) score += 100;
  else if (nname.startsWith(nq)) score += 60;
  else if (wordBoundaryIndex(nname, nq) >= 0) score += 40;
  else if (nname.includes(nq)) score += 20;

  // Ingredient signal (if present)
  const ings = (d.ingredientsNormalized ?? []).map(norm);
  if (ings.length) {
    const idx = ings.indexOf(nq);
    if (idx >= 0) {
      score += 50 - Math.min(idx, 4) * 10; // base spirit > garnish
    } else if (ings.some((s) => wordBoundaryIndex(s, nq) >= 0)) {
      score += 25;
    } else if (ings.some((s) => s.includes(nq))) {
      score += 10;
    }
  }

  // Small boost for having a thumbnail
  if (d.strDrinkThumb) score += 5;

  return score;
}

// Rerank and prune a list of drinks for the given query
function rerankAndPrune(query: string, input: Rankable[]) {
  const q = query.trim();
  const genericOneWord =
    q.split(/\s+/).length === 1 && STOP_GENERIC.has(norm(q));
  const strictCut = genericOneWord ? 40 : 10;

  return input
    .map((d) => ({ d, s: scoreDrink(q, d) }))
    .filter(({ s }) => s >= strictCut)
    .sort((a, b) => b.s - a.s)
    .slice(0, 60)
    .map(({ d }) => d);
}

/**
 * Real starter items from TheCocktailDB:
 *  - Margarita:      11007
 *  - Mojito:         11000
 *  - Old Fashioned:  11001
 *  - Manhattan:      11008
 *  - Vodka Martini:  14167
 *  - Moscow Mule:    11009
 */

// Curated starter list
const STARTERS: Cocktail[] = [
  {
    idDrink: '11007',
    strDrink: 'Margarita',
    strDrinkThumb:
      'https://www.thecocktaildb.com/images/media/drink/5noda61589575158.jpg',
  },
  {
    idDrink: '11000',
    strDrink: 'Mojito',
    strDrinkThumb:
      'https://www.thecocktaildb.com/images/media/drink/metwgh1606770327.jpg',
  },
  {
    idDrink: '11001',
    strDrink: 'Old Fashioned',
    strDrinkThumb:
      'https://www.thecocktaildb.com/images/media/drink/vrwquq1478252802.jpg',
  },
  {
    idDrink: '11008',
    strDrink: 'Manhattan',
    strDrinkThumb:
      'https://www.thecocktaildb.com/images/media/drink/yk70e31606771240.jpg',
  },
  {
    idDrink: '14167',
    strDrink: 'Vodka Martini',
    strDrinkThumb:
      'https://www.thecocktaildb.com/images/media/drink/qyxrqw1439906528.jpg',
  },
  {
    idDrink: '11009',
    strDrink: 'Moscow Mule',
    strDrinkThumb:
      'https://www.thecocktaildb.com/images/media/drink/3pylqc1504370988.jpg',
  },
];

// Main search screen component
export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Cocktail[]>(STARTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFoundTerm, setNotFoundTerm] = useState<string | null>(null);

  // Navigation drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Favorites
  const { items: favItems, toggle } = useFavorites();
  const favIds = useMemo(
    () => new Set((favItems ?? []).map((f) => f.id)),
    [favItems],
  );

  // Safe area insets
  const insets = useSafeAreaInsets();

  // Debounce timer
  const debounceMs = 350;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trimmed = useMemo(() => query.trim(), [query]);

  // FlatList ref to jump to top
  const listRef = useRef<FlatList<Cocktail>>(null);

  // Pagination
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const pagedResults = results.slice(0, page * PAGE_SIZE);

  // Reset to first page and jump to top whenever search text changes
  useEffect(() => {
    setPage(1);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [trimmed]);

  // Also jump to top when a new result set arrives (after API resolves)
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [results]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    // Short queries → show curated starters
    if (trimmed.length < 2) {
      setLoading(false);
      setError(null);
      setNotFoundTerm(null);
      setResults(STARTERS);
      return;
    }

    // Debounced search
    timer.current = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        setNotFoundTerm(null);
        try {
          Keyboard.dismiss();

          const words = trimmed.split(/\s+/);
          const qNorm = trimmed.toLowerCase();
          const isGenericOneWord =
            words.length === 1 && STOP_GENERIC.has(qNorm);

          // Pull candidates
          let byName: Cocktail[] = [];
          let byIng: Cocktail[] = [];
          let drinks: Cocktail[] = [];

          if (words.length === 1) {
            // single token
            byName = await searchByName(trimmed);

            // For generic base spirits ("gin", "rum", …), ingredient filter is too broad.
            if (!isGenericOneWord) {
              byIng = await filterByIngredient(trimmed);
            }

            if (byIng.length && byName.length) {
              // Intersect on id
              const set = new Set(byName.map((d) => d.idDrink));
              const inter = byIng.filter((d) => set.has(d.idDrink));

              // If intersection is too small, backfill with top name results
              if (inter.length >= 6) {
                drinks = inter;
              } else {
                const used = new Set(inter.map((d) => d.idDrink));
                const backfill = byName
                  .filter((d) => !used.has(d.idDrink))
                  .slice(0, 20);
                drinks = [...inter, ...backfill];
              }
            } else {
              drinks = byIng.length ? byIng : byName;
            }
          } else {
            // multi-token → name search only
            drinks = await searchByName(trimmed);
          }

          if (!drinks.length) {
            setNotFoundTerm(trimmed);
            drinks = STARTERS;
          }

          // Import on-demand to keep bundle slim.
          let detailed: (Cocktail & { ingredientsNormalized?: string[] })[] =
            drinks as any;
          try {
            const mod = await import('../lib/cocktails');
            if (mod.hydrateDetails) {
              detailed = await mod.hydrateDetails(drinks, 40);
            }
          } catch {
            // no-op if dynamic import fails
          }

          // Ensure thumbs for first few that still miss it
          detailed = (await hydrateThumbs(detailed, 12)) as any;

          // Final local re-ranking + pruning
          const finalList = rerankAndPrune(trimmed, detailed);

          setResults(finalList.length ? finalList : drinks);
        } catch (e: any) {
          setError(e?.message || 'Something went wrong.');
          setNotFoundTerm(null);
          setResults(STARTERS);
        } finally {
          setLoading(false);
        }
      })();
    }, debounceMs);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [trimmed]);

  const onPressSearch = () => setQuery((q) => q.trim());
  const canSearch = trimmed.length >= 2;

  const openDrink = (item: Cocktail) => {
    if (!item?.idDrink) return;
    router.push({
      pathname: '/drink/[drinkId]',
      params: {
        drinkId: String(item.idDrink),
        name: item.strDrink,
        thumbUrl: item.strDrinkThumb ?? undefined,
      },
    });
  };

  // Helper to get preview image URL
  const toPreview = (u?: string | null) =>
    u ? (u.endsWith('/preview') ? u : `${u}/preview`) : undefined;

  // Menu handlers
  const handleMenuPress = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Menu button overlay */}
      <View style={[styles.menuWrap, { top: Math.max(14, insets.top) }]}>
        <MenuButton onPress={handleMenuPress} />
      </View>

      {/* Header with title + search row */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 56 }]}>
        <Text style={styles.title}>Search</Text>

          {/* Search Input + Button */}
          <View style={styles.searchRow}>
            <TextInput
              placeholder="Type an ingredient or a drink…"
              placeholderTextColor="#9A968A"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={onPressSearch}
            />

            <Pressable
              onPress={onPressSearch}
              style={[styles.searchBtn, !canSearch && styles.searchBtnDisabled]}
              accessibilityRole="button"
              disabled={!canSearch}
            >
              <Text style={styles.searchBtnText}>Search</Text>
            </Pressable>
          </View>

          {/* Not found banner */}
          {!!notFoundTerm && !loading && !error && (
            <Text style={styles.banner}>
              {`"${notFoundTerm}" not found — showing popular drinks instead`}
            </Text>
          )}
      </View>

      {/* Results below header */}
      <View style={styles.resultsWrap}>
          {loading && <ActivityIndicator style={{ margin: 12 }} />}
          {error && !loading && (
            <Text style={styles.error}>Error: {error}</Text>
          )}
          {!loading && !error && results.length === 0 && (
            <Text style={styles.empty}>
              No results. Try another ingredient or drink name.
            </Text>
          )}

          <FlatList
            ref={listRef}
            data={pagedResults}
            keyExtractor={(item) => item.idDrink}
            contentContainerStyle={{ paddingBottom: 140 }}
            initialNumToRender={40}
            windowSize={10}
            removeClippedSubviews={false}
            renderItem={({ item }) => {
              const fav = favIds.has(item.idDrink);
              return (
                <View style={styles.cardRow}>
                  <Pressable
                    onPress={() => openDrink(item)}
                    accessibilityRole="button"
                    style={styles.rowLeft}
                  >
                    {item.strDrinkThumb ? (
                      <Image
                        source={{ uri: toPreview(item.strDrinkThumb) }}
                        style={styles.thumbSm}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.thumbSm, styles.thumbFallback]}>
                        <Text style={{ color: '#9A968A' }}>No Image</Text>
                      </View>
                    )}
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.strDrink}
                    </Text>
                  </Pressable>

                  {/* Heart toggle (persisted) */}
                  <Pressable
                    testID="fav-toggle"
                    onPress={() =>
                      void toggle({
                        id: item.idDrink,
                        name: item.strDrink,
                        thumbUrl: item.strDrinkThumb ?? null,
                      })
                    }
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={
                      fav ? 'Remove from favorites' : 'Add to favorites'
                    }
                    style={styles.heartBtn}
                  >
                    <Ionicons
                      name={fav ? 'heart' : 'heart-outline'}
                      size={20}
                      color={fav ? '#FF6B6B' : (Colors.textPrimary as string)}
                    />
                  </Pressable>
                </View>
              );
            }}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={() =>
              pagedResults.length < results.length ? (
                <Pressable
                  onPress={() => setPage((p) => p + 1)}
                  style={{ padding: 16, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff' }}>Load more</Text>
                </Pressable>
              ) : null
            }
          />
      </View>

      {/* Navigation drawer */}
      <NavigationDrawer visible={drawerVisible} onClose={handleCloseDrawer} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#101010' },
  headerWrap: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  menuWrap: { position: 'absolute', left: 14, zIndex: 10 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    color: '#F5F0E1',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  searchBtn: {
    height: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 10,
    backgroundColor: '#1d1d1d',
  },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText: { color: '#F5F0E1', fontWeight: '700' },

  banner: {
    marginTop: 10,
    color: Colors.textSecondary ?? '#D9D4C5',
    fontSize: 13,
    textAlign: 'center',
  },

  resultsWrap: { flex: 1, padding: 16 },
  error: { color: '#ff8a80', marginTop: 8 },
  empty: { color: '#D9D4C5', opacity: 0.8, marginTop: 8 },

  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#141414',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  thumbSm: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#222' },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  cardTitle: { flex: 1, color: '#F5F0E1', fontSize: 16, fontWeight: '600' },

  heartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
});
