import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
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
import { getRandomDrinks } from '@/app/lib/cocktails';
import { useFavorites } from '@/app/lib/useFavorites';
import { useAuth } from '@/app/lib/AuthContext';

// Default avatar when user hasn't set one
const DEFAULT_AVATAR =
  'https://api.dicebear.com/7.x/avataaars/png?seed=default';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [drinks, setDrinks] = useState<CocktailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { items: favItems, toggle } = useFavorites();

  // Use real user data from auth context
  const avatarUrl = user?.avatar_url || DEFAULT_AVATAR;
  const displayName =
    user?.display_name || user?.email?.split('@')[0] || 'User';

  const favIds = React.useMemo(
    () => new Set((favItems ?? []).map((f) => f.id)),
    [favItems],
  );

  // Shared function to fetch and format drinks
  const fetchDrinks = React.useCallback(async () => {
    const randomDrinks = await getRandomDrinks(8);
    return randomDrinks.map((drink) => ({
      id: drink.idDrink,
      name: drink.strDrink,
      thumbUrl: drink.strDrinkThumb ?? null,
      isFavorite: favIds.has(drink.idDrink),
    }));
  }, [favIds]);

  // Fetch random drinks on mount
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        setLoading(true);
        const cocktailItems = await fetchDrinks();
        if (!alive) return;
        setDrinks(cocktailItems);
      } catch (error) {
        console.error('Failed to fetch random drinks:', error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchDrinks]);

  // Update favorite status when favItems change
  useEffect(() => {
    setDrinks((prev) =>
      prev.map((drink) => ({
        ...drink,
        isFavorite: favIds.has(String(drink.id)),
      })),
    );
  }, [favIds]);

  const handleOpen = (id: string | number) => {
    const it = drinks.find((d) => String(d.id) === String(id));
    if (!it) return;
    router.push({
      pathname: '/drink/[drinkId]',
      params: {
        drinkId: String(it.id),
        name: it.name,
        thumbUrl: it.thumbUrl ?? undefined,
      },
    });
  };

  const handleToggleFavorite = (id: string | number, _next: boolean) => {
    const it = drinks.find((d) => String(d.id) === String(id));
    if (!it) return;
    void toggle({
      id: String(it.id),
      name: it.name,
      thumbUrl: it.thumbUrl ?? null,
    });
  };

  const handleMenuPress = () => {
    setDrawerVisible(true);
  };

  const handleProfilePress = () => {
    router.push('/(tabs)/profile');
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const cocktailItems = await fetchDrinks();
      setDrinks(cocktailItems);
    } catch (error) {
      console.error('Failed to refresh drinks:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
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
      {loading ? (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 4 }).map((_, row) => (
            <View key={row} style={styles.skeletonRow}>
              {Array.from({ length: 2 }).map((_, col) => (
                <View key={col} style={styles.skeletonCardWrapper}>
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
          onRefresh={() => {
            void handleRefresh();
          }}
        />
      )}

      {/* Navigation drawer */}
      <NavigationDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 140,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skeletonCardWrapper: {
    flex: 1,
    marginHorizontal: 6,
  },
});
