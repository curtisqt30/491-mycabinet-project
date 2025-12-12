import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import CocktailGrid, { type CocktailItem } from '@/components/ui/CocktailGrid';
import SkeletonCard from '@/components/ui/SkeletonCard';
import NavigationDrawer from '@/components/ui/NavigationDrawer';
import { useDrinks } from '@/app/lib/DrinksContext';
import { useFavorites } from '@/app/lib/useFavorites';
import { useAuth } from '@/app/lib/AuthContext';

// Responsive skeleton layout constants (matching CocktailGrid)
const BASE_WIDTH = 375;
const BASE_PADDING = 16;
const BASE_GAP = 10;
const MIN_PADDING = 10;
const MIN_GAP = 6;

// Default avatar when user hasn't set one
const DEFAULT_AVATAR =
  'https://api.dicebear.com/7.x/avataaars/png?seed=default';

// Hook for responsive skeleton layout
function useSkeletonLayout() {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const scale = Math.min(width / BASE_WIDTH, 1.2);
    const smallScale = Math.max(0.7, scale);

    const padding = Math.max(
      MIN_PADDING,
      Math.round(BASE_PADDING * smallScale),
    );
    const gap = Math.max(MIN_GAP, Math.round(BASE_GAP * smallScale));

    return { padding, gap };
  }, [width]);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const skeletonLayout = useSkeletonLayout();
  const { user } = useAuth();

  // Session-cached drinks from context
  const {
    drinks: baseDrinks,
    loading,
    initialized,
    refreshDrinks,
  } = useDrinks();

  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { items: favItems, toggle } = useFavorites();

  // Use real user data from auth context
  const avatarUrl = user?.avatar_url || DEFAULT_AVATAR;
  const displayName =
    user?.display_name || user?.email?.split('@')[0] || 'User';

  // Memoize favorite IDs set
  const favIds = useMemo(
    () => new Set((favItems ?? []).map((f) => f.id)),
    [favItems],
  );

  // Derive drinks with favorite status - no re-fetch needed when favs change
  const drinks: CocktailItem[] = useMemo(
    () =>
      baseDrinks.map((drink) => ({
        ...drink,
        isFavorite: favIds.has(drink.id),
      })),
    [baseDrinks, favIds],
  );

  // Fetch drinks once per session (on first mount or after logout/clear)
  useEffect(() => {
    if (!initialized) {
      void refreshDrinks();
    }
  }, [initialized, refreshDrinks]);

  const handleOpen = useCallback(
    (id: string | number) => {
      const item = drinks.find((d) => String(d.id) === String(id));
      if (!item) return;
      router.push({
        pathname: '/drink/[drinkId]',
        params: {
          drinkId: String(item.id),
          name: item.name,
          thumbUrl: item.thumbUrl ?? undefined,
        },
      });
    },
    [drinks],
  );

  const handleToggleFavorite = useCallback(
    (id: string | number, _next: boolean) => {
      const item = drinks.find((d) => String(d.id) === String(id));
      if (!item) return;
      void toggle({
        id: String(item.id),
        name: item.name,
        thumbUrl: item.thumbUrl ?? null,
      });
    },
    [drinks, toggle],
  );

  const handleMenuPress = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const handleProfilePress = useCallback(() => {
    router.push('/(tabs)/profile');
  }, []);

  // Pull-to-refresh handler - only way to get new random drinks
  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    void (async () => {
      try {
        await refreshDrinks();
      } finally {
        setRefreshing(false);
      }
    })();
  }, [refreshDrinks]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  // Show skeleton only on initial load, not on refreshes
  const showSkeleton = loading && !initialized;

  return (
    <View style={styles.screen}>
      {/* Top-left hamburger menu */}
      <Pressable
        onPress={handleMenuPress}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        hitSlop={12}
        style={[styles.menuWrap, { top: Math.max(14, insets.top) }]}
      >
        <Ionicons name="menu" size={24} color={Colors.textPrimary} />
      </Pressable>

      {/* Top-right profile picture */}
      <Pressable
        onPress={handleProfilePress}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        hitSlop={12}
        style={[styles.profileWrap, { top: Math.max(14, insets.top) }]}
      >
        <Image source={{ uri: avatarUrl }} style={styles.profileImage} />
      </Pressable>

      {/* Header */}
      <View
        style={[
          styles.headerWrap,
          { paddingTop: insets.top + 56, paddingBottom: 24 },
        ]}
      >
        <Text style={styles.greeting}>Hey, {displayName}!</Text>
        <Text style={styles.title}>Choose your next drink</Text>
      </View>

      {/* Drink cards grid or skeleton loading state */}
      {showSkeleton ? (
        <View
          style={[
            styles.skeletonContainer,
            {
              paddingHorizontal: skeletonLayout.padding,
            },
          ]}
        >
          {Array.from({ length: 4 }).map((_, row) => (
            <View
              key={row}
              style={[styles.skeletonRow, { marginBottom: skeletonLayout.gap }]}
            >
              {Array.from({ length: 2 }).map((_, col) => (
                <View
                  key={col}
                  style={[
                    styles.skeletonCardWrapper,
                    { marginHorizontal: skeletonLayout.gap / 4 },
                  ]}
                >
                  <SkeletonCard />
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <CocktailGrid
          data={drinks}
          onPressItem={handleOpen}
          onToggleFavorite={handleToggleFavorite}
          bottomPad={140}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* Navigation drawer */}
      <NavigationDrawer visible={drawerVisible} onClose={handleCloseDrawer} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  headerWrap: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  menuWrap: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
    padding: 8,
    borderRadius: 999,
  },
  profileWrap: {
    position: 'absolute',
    right: 14,
    zIndex: 10,
    borderRadius: 999,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  skeletonContainer: {
    paddingTop: 8,
    paddingBottom: 140,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonCardWrapper: {
    flex: 1,
  },
});
