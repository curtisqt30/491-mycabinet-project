import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  Image,
  Platform,
  UIManager,
  Pressable,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MenuButton from '@/components/ui/MenuButton';
import NavigationDrawer from '@/components/ui/NavigationDrawer';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import { normalizeIngredient } from '../utils/normalize';
import { ingredientImageUrl } from '../utils/cocktaildb';
import { loadIngredientCatalog } from '../utils/ingredientCatalog';
import { categorizeIngredient } from '../utils/categorizeIngredient';
import { useApi } from '@/app/lib/useApi';
import { useAuth } from '@/app/lib/AuthContext';

// Components
import Chip from '@/components/my-ingredients/Chip';
import Tab from '@/components/my-ingredients/Tab';
import SearchBar from '@/components/my-ingredients/Searchbar';
import Toast from '@/components/my-ingredients/Toast';
import ActionSheet from '@/components/my-ingredients/ActionSheet';
import CabinetRow, {
  type Category,
} from '@/components/my-ingredients/CabinetRow';
import ShoppingRow from '@/components/my-ingredients/ShoppingRow';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** ---------- Types */
export type Ingredient = {
  id: string;
  name: string;
  category: Category;
  owned: boolean;
  wanted?: boolean;
  impactScore?: number;
  imageUrl?: string;
  /** 0..1 fraction remaining. default 1 (full). */
  qty?: number;
  /** User-entered price for budgeting */
  price?: number;
};

const STORAGE_KEY = '@mixology:cabinet_v1';
const BUDGET_KEY = '@mixology:budget_v1';
const SPENT_KEY = '@mixology:spent_v1';

/** ---------- Main Screen Component ---------- */
export default function MyIngredientsScreen() {
  const insets = useSafeAreaInsets();
  const { get, post, put, del } = useApi();
  const { isAuthenticated } = useAuth();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [activeTab, setActiveTab] = useState<'cabinet' | 'shopping'>('cabinet');
  const [query, setQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'All' | Category>('All');

  // Budget State
  const [budget, setBudget] = useState<number>(0);
  const [spent, setSpent] = useState<number>(0);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [tempBudget, setTempBudget] = useState('');

  const [toast, setToast] = useState<{
    text: string;
    onUndo: () => void;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Sheet & rename
  const [openMenuForId, setOpenMenuForId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingItem, setRenamingItem] = useState<Ingredient | null>(null);
  const [newName, setNewName] = useState('');

  // Price Modal
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [pricingItem, setPricingItem] = useState<Ingredient | null>(null);
  const [newPrice, setNewPrice] = useState('');

  // local persistence state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [_syncing, setSyncing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track backend ingredient IDs for syncing
  const backendIngredientMap = useRef<Map<string, number>>(new Map());

  // adding new ingredient
  const [addVisible, setAddVisible] = useState(false);
  const [catalog, setCatalog] = useState<{ name: string }[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [qty, setQty] = useState(1);
  const [addPrice, setAddPrice] = useState('');
  const [targetList, setTargetList] = useState<'cabinet' | 'shopping'>('cabinet');

  // Navigation drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);

  /** ----- Load from Database or AsyncStorage ----- */
  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);

        // Load budget and spent first (always from AsyncStorage)
        const rawBudget = await AsyncStorage.getItem(BUDGET_KEY);
        if (rawBudget) {
          setBudget(parseFloat(rawBudget));
        }
        const rawSpent = await AsyncStorage.getItem(SPENT_KEY);
        if (rawSpent) {
          setSpent(parseFloat(rawSpent));
        }

        // Try to load from database first (if authenticated)
        if (isAuthenticated) {
          try {
            const pantryItems =
              await get<
                { id: number; ingredient_name: string; quantity: number }[]
              >('/users/me/pantry');

            if (pantryItems && pantryItems.length > 0) {
              // Convert backend format to local format
              const loadedIngredients: Ingredient[] = pantryItems.map(
                (item) => {
                  const { displayName, canonicalName } = normalizeIngredient(
                    item.ingredient_name,
                  );
                  const localId = `db_${item.id}`;
                  backendIngredientMap.current.set(localId, item.id);

                  return {
                    id: localId,
                    name: displayName,
                    category: categorizeIngredient(displayName),
                    owned: true,
                    qty: item.quantity,
                    price: 0,
                    imageUrl: ingredientImageUrl(
                      canonicalName || displayName,
                      'Small',
                    ),
                  };
                },
              );

              // Also load any cached shopping list items
              const raw = await AsyncStorage.getItem(STORAGE_KEY);
              if (raw) {
                const cached = JSON.parse(raw) as Ingredient[];
                const shoppingItems = cached
                  .filter((i) => i.wanted && !i.owned)
                  .map((i) => ({
                    ...i,
                    category: i.category === 'Other' ? categorizeIngredient(i.name) : i.category,
                  }));
                // Merge: backend owned items + cached shopping items
                const merged = [...loadedIngredients, ...shoppingItems];
                setIngredients(merged);
              } else {
                setIngredients(loadedIngredients);
              }

              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Failed to load from database, using cache:', e);
          }
        }

        // Fallback to AsyncStorage
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Ingredient[];
          setIngredients(
            parsed.map((i) => ({
              ...i,
              qty: typeof i.qty === 'number' ? i.qty : 1,
              price: typeof i.price === 'number' ? i.price : 0,
              // Recategorize if it was 'Other' (legacy data)
              category: i.category === 'Other' ? categorizeIngredient(i.name) : i.category,
            })),
          );
        }
      } catch (e) {
        console.warn('Failed to load cabinet:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, get]);

  /** ----- Sync to AsyncStorage (cache) ----- */
  useEffect(() => {
    if (loading) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      void (async () => {
        try {
          setSaving(true);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ingredients));
          await AsyncStorage.setItem(BUDGET_KEY, budget.toString());
          await AsyncStorage.setItem(SPENT_KEY, spent.toString());
        } catch (e) {
          console.warn('Failed to save cabinet to cache:', e);
        } finally {
          setSaving(false);
        }
      })();
    }, 250);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [ingredients, budget, spent, loading]);

  /** ----- Sync to Database (background) ----- */
  const syncIngredientToBackend = useCallback(
    async (ingredient: Ingredient, action: 'add' | 'update' | 'remove') => {
      if (!isAuthenticated || !ingredient.owned) return;

      try {
        if (action === 'add') {
          const response = await post<{
            id: number;
            ingredient_name: string;
            quantity: number;
          }>('/users/me/pantry', {
            ingredient_name: ingredient.name,
            quantity: ingredient.qty ?? 1.0,
          });

          backendIngredientMap.current.set(ingredient.id, response.id);
        } else if (action === 'update') {
          const backendId = backendIngredientMap.current.get(ingredient.id);
          if (backendId) {
            await put(`/users/me/pantry/${backendId}`, {
              quantity: ingredient.qty ?? 1.0,
            });
          }
        } else if (action === 'remove') {
          const backendId = backendIngredientMap.current.get(ingredient.id);
          if (backendId) {
            await del(`/users/me/pantry/${backendId}`);
            backendIngredientMap.current.delete(ingredient.id);
          }
        }
      } catch (e) {
        console.warn(`Failed to sync ingredient ${action}:`, e);
      }
    },
    [isAuthenticated, post, put, del],
  );

  /** ----- Debounced sync to backend ----- */
  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);

    syncTimer.current = setTimeout(() => {
      void (async () => {
        try {
          setSyncing(true);

          const pantryItems =
            await get<
              { id: number; ingredient_name: string; quantity: number }[]
            >('/users/me/pantry');

          const backendMap = new Map<string, number>();
          pantryItems.forEach((item) => {
            const { displayName } = normalizeIngredient(item.ingredient_name);
            backendMap.set(displayName.toLowerCase(), item.id);
          });

          const ownedIngredients = ingredients.filter((i) => i.owned);

          for (const ingredient of ownedIngredients) {
            const normalizedName = ingredient.name.toLowerCase();
            const backendId = backendMap.get(normalizedName);

            if (backendId) {
              const backendItem = pantryItems.find((p) => p.id === backendId);
              if (
                backendItem &&
                Math.abs((backendItem.quantity ?? 1) - (ingredient.qty ?? 1)) >
                  0.01
              ) {
                await syncIngredientToBackend(ingredient, 'update');
              }
              backendIngredientMap.current.set(ingredient.id, backendId);
            } else {
              await syncIngredientToBackend(ingredient, 'add');
            }
          }

          for (const [localId, backendId] of backendIngredientMap.current) {
            const ingredient = ingredients.find((i) => i.id === localId);
            if (!ingredient || !ingredient.owned) {
              await del(`/users/me/pantry/${backendId}`);
              backendIngredientMap.current.delete(localId);
            }
          }
        } catch (e) {
          console.warn('Failed to sync to backend:', e);
        } finally {
          setSyncing(false);
        }
      })();
    }, 1000);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [
    ingredients,
    loading,
    isAuthenticated,
    get,
    del,
    syncIngredientToBackend,
  ]);

  /** ----- Derived data ----- */
  const ownedCount = useMemo(
    () => ingredients.filter((i) => i.owned).length,
    [ingredients],
  );
  const wantedCount = useMemo(
    () => ingredients.filter((i) => i.wanted).length,
    [ingredients],
  );

  const categories: ('All' | Category)[] = useMemo(() => {
    const set = new Set<Category>();
    ingredients.forEach((i) => set.add(i.category));
    return ['All', ...Array.from(set)];
  }, [ingredients]);

  const sortByName = useCallback(
    (list: Ingredient[]) => {
      const out = [...list].sort((a, b) => a.name.localeCompare(b.name));
      return sortAsc ? out : out.reverse();
    },
    [sortAsc],
  );

  const filterByQueryAndCategory = useCallback(
    (list: Ingredient[]) => {
      let out = list;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        out = out.filter((i) => i.name.toLowerCase().includes(q));
      }
      if (categoryFilter !== 'All')
        out = out.filter((i) => i.category === categoryFilter);
      return out;
    },
    [query, categoryFilter],
  );

  const cabinetItems = useMemo(
    () =>
      sortByName(filterByQueryAndCategory(ingredients.filter((i) => i.owned))),
    [ingredients, sortByName, filterByQueryAndCategory],
  );

  const shoppingItems = useMemo(
    () =>
      sortByName(filterByQueryAndCategory(ingredients.filter((i) => i.wanted))),
    [ingredients, sortByName, filterByQueryAndCategory],
  );

  // Budget Calculations
  const currentCartTotal = useMemo(() => {
    return shoppingItems.reduce((sum, item) => sum + (item.price || 0), 0);
  }, [shoppingItems]);

  const remainingBudget = budget - (spent + currentCartTotal);
  const isOverBudget = remainingBudget < 0;

  /** ----- Actions ----- */
  const clearQuery = () => setQuery('');

  const toggleWanted = (id: string) =>
    setIngredients((prev) =>
      prev.map((i) => (i.id === id ? { ...i, wanted: !i.wanted } : i)),
    );

  const onPressAdd = async () => {
    setAddVisible(true);
    setAddPrice('');
    setTargetList(activeTab);
    if (!catalog.length && !catalogLoading) {
      setCatalogLoading(true);
      try {
        setCatalog(await loadIngredientCatalog());
      } finally {
        setCatalogLoading(false);
      }
    }
  };

  const deleteIngredient = (id: string) => {
    setIngredients((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const removed = prev[idx];
      const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      setToast({
        text: `Deleted "${removed.name}"`,
        onUndo: () => {
          setIngredients((prev2) => {
            const exists = prev2.some((x) => x.id === removed.id);
            return exists
              ? prev2
              : [...prev2.slice(0, idx), removed, ...prev2.slice(idx)];
          });
          setToast(null);
        },
      });
      return next;
    });
  };

  const addToShopping = (id: string) =>
    setIngredients((prev) =>
      prev.map((i) => (i.id === id ? { ...i, wanted: true } : i)),
    );

  const removeFromCabinet = (id: string) => {
    const removed = ingredients.find((i) => i.id === id);
    if (!removed) return;
    setIngredients((prev) =>
      prev.map((i) => (i.id === id ? { ...i, owned: false } : i)),
    );
    setToast({
      text: `Removed "${removed.name}" from Cabinet`,
      onUndo: () => {
        setIngredients((prev) =>
          prev.map((i) => (i.id === id ? { ...i, owned: true } : i)),
        );
        setToast(null);
      },
    });
  };

  const removeFromShopping = (id: string) => {
    const removed = ingredients.find((i) => i.id === id);
    if (!removed) return;
    setIngredients((prev) =>
      prev.map((i) => (i.id === id ? { ...i, wanted: false } : i)),
    );
    setToast({
      text: `Removed "${removed.name}" from Shopping`,
      onUndo: () => {
        setIngredients((prev) =>
          prev.map((i) => (i.id === id ? { ...i, wanted: true } : i)),
        );
        setToast(null);
      },
    });
  };

  const adjustQty = useCallback(
    async (id: string, nextQty: number) => {
      const clamped = Math.max(0, Math.min(1, nextQty));
      const rounded = Math.round(clamped * 100) / 100;

      setIngredients((prev) => {
        const updated = prev.map((i) =>
          i.id === id ? { ...i, qty: rounded } : i,
        );

        const ingredient = updated.find((i) => i.id === id);
        if (isAuthenticated && ingredient?.owned) {
          syncIngredientToBackend(ingredient, 'update').catch((e) => {
            console.warn('Failed to sync quantity update:', e);
          });
        }

        return updated;
      });
    },
    [isAuthenticated, syncIngredientToBackend],
  );

  const markPurchasedSingle = (id: string) => {
    const it = ingredients.find((i) => i.id === id);
    if (!it) return;

    const cost = it.price || 0;
    setSpent((prev) => prev + cost);

    setIngredients((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, wanted: false, owned: true, qty: 1 } : i,
      ),
    );
    setToast({
      text: `Marked "${it.name}" as purchased`,
      onUndo: () => {
        setSpent((prev) => Math.max(0, prev - cost));
        setIngredients((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, wanted: true, owned: false, qty: it.qty ?? 1 }
              : i,
          ),
        );
        setToast(null);
      },
    });
  };

  const markPurchased = () => {
    if (shoppingItems.length === 0) return;

    const totalCost = shoppingItems.reduce((sum, i) => sum + (i.price || 0), 0);
    setSpent((prev) => prev + totalCost);

    setIngredients((prev) =>
      prev.map((i) =>
        i.wanted ? { ...i, wanted: false, owned: true, qty: 1 } : i,
      ),
    );
  };

  const handleRename = (id: string) => {
    const it = ingredients.find((i) => i.id === id);
    if (!it) return;
    setRenamingItem(it);
    setNewName(it.name);
    setRenameModalVisible(true);
    setIsSheetOpen(false);
    setOpenMenuForId(null);
  };

  const confirmRename = () => {
    if (!renamingItem || !newName.trim()) return;
    const trimmed = newName.trim();
    const { displayName, canonicalName } = normalizeIngredient(trimmed);
    if (trimmed === renamingItem.name) {
      setRenameModalVisible(false);
      setRenamingItem(null);
      setNewName('');
      return;
    }
    setIngredients((prev) =>
      prev.map((i) =>
        i.id === renamingItem.id
          ? {
              ...i,
              name: displayName,
              imageUrl: ingredientImageUrl(
                canonicalName || displayName,
                'Small',
              ),
            }
          : i,
      ),
    );
    setToast({
      text: `Renamed "${renamingItem.name}" to "${trimmed}"`,
      onUndo: () => {
        setIngredients((prev) =>
          prev.map((i) =>
            i.id === renamingItem.id ? { ...i, name: renamingItem.name } : i,
          ),
        );
        setToast(null);
      },
    });
    setRenameModalVisible(false);
    setRenamingItem(null);
    setNewName('');
  };

  const cancelRename = () => {
    setRenameModalVisible(false);
    setRenamingItem(null);
    setNewName('');
  };

  // Price Logic
  const handleSetPrice = (id: string) => {
    const it = ingredients.find((i) => i.id === id);
    if (!it) return;
    setPricingItem(it);
    setNewPrice(it.price ? it.price.toString() : '');
    setPriceModalVisible(true);
    setIsSheetOpen(false);
    setOpenMenuForId(null);
  };

  const confirmPrice = () => {
    if (!pricingItem) return;
    const priceVal = parseFloat(newPrice);
    const finalPrice = isNaN(priceVal) ? 0 : Math.max(0, priceVal);

    setIngredients((prev) =>
      prev.map((i) =>
        i.id === pricingItem.id ? { ...i, price: finalPrice } : i,
      ),
    );

    setPriceModalVisible(false);
    setPricingItem(null);
    setNewPrice('');
  };

  const cancelPrice = () => {
    setPriceModalVisible(false);
    setPricingItem(null);
    setNewPrice('');
  };

  // Budget Logic
  const handleOpenBudget = () => {
    setTempBudget(budget > 0 ? budget.toString() : '');
    setBudgetModalVisible(true);
  };

  const saveBudget = () => {
    const val = parseFloat(tempBudget);
    setBudget(isNaN(val) ? 0 : Math.max(0, val));
    setBudgetModalVisible(false);
  };

  const cancelBudget = () => {
    setBudgetModalVisible(false);
    setTempBudget('');
  };

  const resetSpending = () => {
    Alert.alert(
      'Reset Spending History?',
      "This will set your 'Total Spent' to $0.00. Do this at the start of a new month.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSpent(0);
            setBudgetModalVisible(false);
          },
        },
      ],
    );
  };

  // Toast lifecycle
  useEffect(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current as unknown as number);
      toastTimerRef.current = null;
    }
    if (toast) {
      toastTimerRef.current = setTimeout(
        () => setToast(null),
        5000,
      ) as unknown as number;
    }
    return () => {
      if (toastTimerRef.current)
        clearTimeout(toastTimerRef.current as unknown as number);
    };
  }, [toast]);

  // Menu handlers
  const handleMenuPress = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  /** ----- Renderers ----- */
  const renderCabinetItem = ({ item }: { item: Ingredient }) => (
    <CabinetRow
      item={item}
      onToggleMenu={(id) => {
        setOpenMenuForId(id);
        setIsSheetOpen(true);
      }}
      onAddToShopping={addToShopping}
      onRemoveFromCabinet={removeFromCabinet}
      onAdjustQty={(id, qty) => {
        void adjustQty(id, qty);
      }}
    />
  );

  const renderShoppingItem = ({ item }: { item: Ingredient }) => (
    <ShoppingRow
      item={item}
      onToggleMenu={(id) => {
        setOpenMenuForId(id);
        setIsSheetOpen(true);
      }}
      onToggleWanted={toggleWanted}
      onMarkPurchased={markPurchasedSingle}
    />
  );

  const renderEmpty = (title: string, subtitle: string, icon?: string) => (
    <View style={styles.emptyWrap}>
      {icon && <Text style={styles.emptyIcon}>{icon}</Text>}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );

  /** ----- Views ----- */
  const CabinetView = (
    <>
      <SearchBar value={query} onChangeText={setQuery} onClear={clearQuery} />

      <View style={styles.filtersRow}>
        <View style={styles.categoriesWrap}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              active={categoryFilter === cat}
              onPress={() => setCategoryFilter(cat)}
            />
          ))}
        </View>
        <Chip
          label={sortAsc ? 'A–Z' : 'Z–A'}
          active
          onPress={() => setSortAsc((s) => !s)}
        />
      </View>

      <FlatList
        style={styles.list}
        data={cabinetItems}
        keyExtractor={(i) => i.id}
        renderItem={renderCabinetItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        overScrollMode="never"
        ListEmptyComponent={renderEmpty(
          query ? 'No matches' : 'Cabinet is empty',
          query
            ? `No ingredients match "${query}".`
            : 'Add your first items using the ＋ button.',
          query ? '🔍' : '🍸',
        )}
        onScrollBeginDrag={() => {
          setIsSheetOpen(false);
          setOpenMenuForId(null);
        }}
      />
    </>
  );

  const ShoppingView = (
    <>
      {/* Budget Header */}
      <View style={styles.budgetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.budgetLabel}>Monthly Budget</Text>
          <Text
            style={[styles.budgetAmount, isOverBudget && styles.overBudget]}
          >
            ${remainingBudget.toFixed(2)}{' '}
            <Text style={styles.budgetTotal}>/ ${budget.toFixed(2)}</Text>
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 6, gap: 12 }}>
            <Text style={styles.spentText}>
              Spent:{' '}
              <Text style={{ color: '#E4E4E7' }}>${spent.toFixed(2)}</Text>
            </Text>
            <Text style={styles.spentText}>
              Cart:{' '}
              <Text style={{ color: '#E4E4E7' }}>
                ${currentCartTotal.toFixed(2)}
              </Text>
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.setBudgetBtn}
          onPress={handleOpenBudget}
        >
          <Text style={styles.setBudgetBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <SearchBar value={query} onChangeText={setQuery} onClear={clearQuery} />

      <View style={styles.filtersRow}>
        <TouchableOpacity
          onPress={markPurchased}
          style={[
            styles.primaryBtn,
            shoppingItems.length === 0 && { opacity: 0.5 },
          ]}
          disabled={shoppingItems.length === 0}
        >
          <Text style={styles.primaryBtnText}>Mark purchased</Text>
        </TouchableOpacity>
        <View style={styles.categoriesWrap}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              active={categoryFilter === cat}
              onPress={() => setCategoryFilter(cat)}
            />
          ))}
        </View>
        <Chip
          label={sortAsc ? 'A–Z' : 'Z–A'}
          active
          onPress={() => setSortAsc((s) => !s)}
        />
      </View>

      <FlatList
        style={styles.list}
        data={shoppingItems}
        keyExtractor={(i) => i.id}
        renderItem={renderShoppingItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        overScrollMode="never"
        ListEmptyComponent={renderEmpty(
          query ? 'No matches' : 'No items',
          query
            ? `No items match "${query}".`
            : 'Add items to your Shopping List using the ＋ button.',
          query ? '🔍' : '🛒',
        )}
        onScrollBeginDrag={() => {
          setIsSheetOpen(false);
          setOpenMenuForId(null);
        }}
      />
    </>
  );

  const sheetActions = !openMenuForId
    ? []
    : activeTab === 'cabinet'
      ? [
          { label: 'Rename', onPress: () => handleRename(openMenuForId) },
          {
            label: 'Delete',
            danger: true,
            onPress: () => deleteIngredient(openMenuForId),
          },
        ]
      : [
          { label: 'Edit Price', onPress: () => handleSetPrice(openMenuForId) },
          { label: 'Rename', onPress: () => handleRename(openMenuForId) },
          {
            label: 'Mark Purchased',
            onPress: () => markPurchasedSingle(openMenuForId),
          },
          {
            label: 'Remove from Shopping',
            danger: true,
            onPress: () => removeFromShopping(openMenuForId),
          },
          {
            label: 'Delete',
            danger: true,
            onPress: () => deleteIngredient(openMenuForId),
          },
        ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Menu button overlay */}
      <View style={[styles.menuWrap, { top: Math.max(14, insets.top) }]}>
        <MenuButton onPress={handleMenuPress} />
      </View>

      {/* Centered page header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 56 }]}>
        <Text style={styles.title}>My Cabinet</Text>
      </View>

      {/* Loading/Saving indicator - absolute overlay */}
      {(loading || saving) && (
        <View style={[styles.statusBadge, { top: insets.top + 56 + 36 }]}>
          <Text style={styles.statusText}>
            {loading ? 'Loading…' : 'Saving…'}
          </Text>
        </View>
      )}

      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabsRow}>
          <Tab
            label={`Owned (${ownedCount})`}
            active={activeTab === 'cabinet'}
            onPress={() => setActiveTab('cabinet')}
          />
          <Tab
            label={`Shopping List (${wantedCount})`}
            active={activeTab === 'shopping'}
            onPress={() => setActiveTab('shopping')}
          />
        </View>
        <View style={styles.body}>
          {activeTab === 'cabinet' ? CabinetView : ShoppingView}
        </View>

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            void onPressAdd();
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.fabPlus}>＋</Text>
        </TouchableOpacity>

        {/* Toast */}
        {toast && (
          <View
            style={{
              position: 'absolute',
              bottom: 160,
              left: 20,
              right: 20,
              zIndex: 100,
            }}
          >
            <Toast text={toast.text} onUndo={toast.onUndo} />
          </View>
        )}

        {/* Action sheet */}
        <ActionSheet
          visible={isSheetOpen && !!openMenuForId}
          onClose={() => {
            setIsSheetOpen(false);
            setOpenMenuForId(null);
          }}
          actions={sheetActions}
        />

        {/* Budget Modal */}
        <Modal
          visible={budgetModalVisible}
          transparent
          animationType="fade"
          onRequestClose={cancelBudget}
        >
          <Pressable style={styles.modalOverlay} onPress={cancelBudget}>
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>Set Monthly Budget</Text>
              <TextInput
                style={styles.modalInput}
                value={tempBudget}
                onChangeText={setTempBudget}
                placeholder="Enter amount (e.g. 100)"
                placeholderTextColor="#8B8B8B"
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
                onSubmitEditing={saveBudget}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={cancelBudget}
                  style={[styles.modalButton, styles.modalButtonCancel]}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveBudget}
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                >
                  <Text style={styles.modalButtonTextConfirm}>Save</Text>
                </TouchableOpacity>
              </View>

              {/* Reset Spending Button */}
              <TouchableOpacity
                onPress={resetSpending}
                style={{ marginTop: 20, alignSelf: 'center', padding: 8 }}
              >
                <Text
                  style={{ color: '#ef4444', fontSize: 14, fontWeight: '600' }}
                >
                  Reset Spending History
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Price Modal */}
        <Modal
          visible={priceModalVisible}
          transparent
          animationType="fade"
          onRequestClose={cancelPrice}
        >
          <Pressable style={styles.modalOverlay} onPress={cancelPrice}>
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>Item Price</Text>
              <TextInput
                style={styles.modalInput}
                value={newPrice}
                onChangeText={setNewPrice}
                placeholder="0.00"
                placeholderTextColor="#8B8B8B"
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                onSubmitEditing={confirmPrice}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={cancelPrice}
                  style={[styles.modalButton, styles.modalButtonCancel]}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmPrice}
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                >
                  <Text style={styles.modalButtonTextConfirm}>Set Price</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Rename Modal */}
        <Modal
          visible={renameModalVisible}
          transparent
          animationType="fade"
          onRequestClose={cancelRename}
        >
          <Pressable style={styles.modalOverlay} onPress={cancelRename}>
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>Rename Ingredient</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Enter new name"
                placeholderTextColor="#8B8B8B"
                autoFocus
                selectTextOnFocus
                onSubmitEditing={confirmRename}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={cancelRename}
                  style={[styles.modalButton, styles.modalButtonCancel]}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmRename}
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  disabled={!newName.trim()}
                >
                  <Text
                    style={[
                      styles.modalButtonTextConfirm,
                      !newName.trim() && styles.modalButtonTextDisabled,
                    ]}
                  >
                    Rename
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Add Ingredient Modal */}
        <Modal
          visible={addVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAddVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setAddVisible(false)}
          >
            <Pressable
              style={[
                styles.modalContent,
                {
                  maxWidth: 420,
                  marginBottom: insets.bottom + 20,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>Add Ingredient</Text>

              {/* Search input */}
              <TextInput
                value={addQuery}
                onChangeText={setAddQuery}
                placeholder="Search CocktailDB (e.g., Gin, Triple Sec, Lime)"
                placeholderTextColor="#8B8B8B"
                style={styles.modalInput}
              />

              {/* List Toggle */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Add to:</Text>
                <View style={styles.toggleOptions}>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      targetList === 'cabinet' && styles.toggleOptionActive,
                    ]}
                    onPress={() => setTargetList('cabinet')}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        targetList === 'cabinet' && styles.toggleTextActive,
                      ]}
                    >
                      Cabinet
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      targetList === 'shopping' && styles.toggleOptionActive,
                    ]}
                    onPress={() => setTargetList('shopping')}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        targetList === 'shopping' && styles.toggleTextActive,
                      ]}
                    >
                      Shopping
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Price Input for Add */}
              <Text
                style={{ color: '#CFCFCF', fontWeight: '600', marginBottom: 8 }}
              >
                Estimated Price (Optional)
              </Text>
              <TextInput
                value={addPrice}
                onChangeText={setAddPrice}
                placeholder="0.00"
                placeholderTextColor="#8B8B8B"
                keyboardType="decimal-pad"
                style={[styles.modalInput, { marginBottom: 16 }]}
              />

              {/* Quantity stepper */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: '#CFCFCF', fontWeight: '600' }}>
                  Quantity
                </Text>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <TouchableOpacity
                    onPress={() => setQty(Math.max(0, qty - 0.25))}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: '#1A1A1E',
                      borderWidth: 1,
                      borderColor: '#2A2A30',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#CFCFCF', fontSize: 18 }}>−</Text>
                  </TouchableOpacity>
                  <Text
                    style={{ color: '#fff', minWidth: 48, textAlign: 'center' }}
                  >
                    {Math.round(Math.max(0, Math.min(1, qty)) * 100)}%
                  </Text>
                  <TouchableOpacity
                    onPress={() => setQty(Math.min(1, qty + 0.25))}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: '#1A1A1E',
                      borderWidth: 1,
                      borderColor: '#2A2A30',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#CFCFCF', fontSize: 18 }}>＋</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Results list */}
              <View style={{ maxHeight: 240 }}>
                {catalogLoading ? (
                  <Text style={{ color: '#9BA3AF' }}>Loading catalog…</Text>
                ) : (
                  <FlatList
                    keyboardShouldPersistTaps="handled"
                    data={catalog.filter((c) =>
                      c.name
                        .toLowerCase()
                        .includes(addQuery.trim().toLowerCase()),
                    )}
                    keyExtractor={(i) => i.name}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => {
                          void (async () => {
                            const id = `${Date.now()}`;
                            const { displayName, canonicalName } =
                              normalizeIngredient(item.name);
                            const name = displayName;

                            let p = parseFloat(addPrice);
                            if (isNaN(p)) p = 0;

                            const newIngredient: Ingredient = {
                              id,
                              name,
                              category: categorizeIngredient(name),
                              owned: targetList === 'cabinet',
                              wanted: targetList === 'shopping',
                              impactScore: Math.random(),
                              imageUrl: ingredientImageUrl(
                                canonicalName || name,
                                'Small',
                              ),
                              qty: Math.max(0, Math.min(1, qty)),
                              price: p,
                            };

                            setIngredients((prev) => [...prev, newIngredient]);

                            if (targetList === 'cabinet' && isAuthenticated) {
                              try {
                                await syncIngredientToBackend(
                                  newIngredient,
                                  'add',
                                );
                              } catch (e) {
                                console.warn(
                                  'Failed to sync new ingredient:',
                                  e,
                                );
                              }
                            }

                            setAddVisible(false);
                            setAddQuery('');
                            setQty(1);
                            setAddPrice('');
                          })();
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 8,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: '#232329',
                          marginBottom: 8,
                          backgroundColor: '#141418',
                        }}
                      >
                        <Image
                          source={{
                            uri: ingredientImageUrl(item.name, 'Small'),
                          }}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            marginRight: 12,
                            backgroundColor: '#26262B',
                            borderWidth: 1,
                            borderColor: '#2C2C34',
                          }}
                        />
                        <Text
                          style={{
                            color: '#EAEAEA',
                            fontWeight: '600',
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={{ color: '#9BA3AF', fontSize: 12 }}>
                          Tap to add
                        </Text>
                      </TouchableOpacity>
                    )}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    overScrollMode="never"
                  />
                )}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => setAddVisible(false)}
                  style={[styles.modalButton, styles.modalButtonCancel]}
                >
                  <Text style={styles.modalButtonTextCancel}>Close</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>

      {/* Navigation drawer */}
      <NavigationDrawer visible={drawerVisible} onClose={handleCloseDrawer} />
    </>
  );
}

/** ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  body: { flex: 1 },
  list: {
    flex: 1,
    overflow: 'hidden',
  },
  headerWrap: { backgroundColor: Colors.background, alignItems: 'center' },
  statusBadge: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(28, 28, 32, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A30',
    zIndex: 20,
  },
  statusText: {
    color: '#9BA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  menuWrap: { position: 'absolute', left: 14, zIndex: 10 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },

  // Budget Styles
  budgetHeader: {
    backgroundColor: '#1E1E24',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C34',
  },
  budgetLabel: {
    color: '#9BA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  budgetAmount: {
    color: '#22c55e',
    fontSize: 28,
    fontWeight: '700',
  },
  budgetTotal: {
    color: '#555',
    fontSize: 18,
    fontWeight: '500',
  },
  overBudget: {
    color: '#ef4444',
  },
  spentText: {
    color: '#9BA3AF',
    fontSize: 13,
    marginTop: 4,
  },
  setBudgetBtn: {
    backgroundColor: '#2C2C34',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  setBudgetBtnText: {
    color: '#E4E4E7',
    fontSize: 12,
    fontWeight: '600',
  },

  sectionHeader: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 8 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSub: {
    marginTop: 6,
    fontSize: 14,
    color: Colors.textSecondary ?? '#9BA3AF',
    fontWeight: '500',
  },

  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 8,
    flexShrink: 1,
  },

  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 120,
    paddingTop: 10,
    flexGrow: 1,
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.6 },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: Colors.textSecondary ?? '#9BA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: Colors.accentPrimary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.accentPrimary,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 105,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accentPrimary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: 2,
    borderColor: Colors.accentPrimary,
  },
  fabPlus: { color: '#FFFFFF', fontSize: 30, marginTop: -2, fontWeight: '600' },

  // Toggle Row in Modal
  toggleRow: {
    marginBottom: 16,
  },
  toggleLabel: {
    color: '#CFCFCF',
    fontWeight: '600',
    marginBottom: 8,
  },
  toggleOptions: {
    flexDirection: 'row',
    backgroundColor: '#232329',
    borderRadius: 10,
    padding: 2,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleOptionActive: {
    backgroundColor: Colors.accentPrimary,
  },
  toggleText: {
    color: '#8B8B8B',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#2C2C34',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#1A1A1E',
    borderWidth: 1,
    borderColor: '#232329',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#EAEAEA',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalButtonCancel: { backgroundColor: 'transparent', borderColor: '#2A2A30' },
  modalButtonConfirm: {
    backgroundColor: Colors.accentPrimary,
    borderColor: Colors.accentPrimary,
  },
  modalButtonTextCancel: { color: '#CFCFCF', fontSize: 16, fontWeight: '600' },
  modalButtonTextConfirm: {
    color: Colors.accentContrast,
    fontSize: 16,
    fontWeight: '700',
  },
  modalButtonTextDisabled: { color: '#8B8B8B' },
});