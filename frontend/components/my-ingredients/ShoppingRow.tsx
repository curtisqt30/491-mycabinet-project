import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { fallbackIngredientImageUrls } from '../../app/utils/cocktaildb';
import type { Category } from './CabinetRow';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';

export type Ingredient = {
  id: string;
  name: string;
  category: Category;
  owned: boolean;
  wanted?: boolean;
  imageUrl?: string;
  price?: number;
};

export default function ShoppingRow({
  item,
  onToggleMenu,
  onToggleWanted,
  onMarkPurchased,
}: {
  item: Ingredient;
  onToggleMenu: (id: string) => void;
  onToggleWanted: (id: string) => void;
  onMarkPurchased: (id: string) => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allFailed, setAllFailed] = useState(false);

  // Build candidates: custom → CocktailDB fallbacks (Small/Medium/Large), de-duped
  const candidates = useMemo<string[]>(() => {
    const list = [
      ...(item.imageUrl ? [item.imageUrl] : []),
      ...fallbackIngredientImageUrls(item.name),
    ];
    return Array.from(new Set(list));
  }, [item.imageUrl, item.name]);

  const currentSrc =
    candidates[Math.min(idx, Math.max(0, candidates.length - 1))];
  // Bust cache between attempts so cached 404s don't stick (especially on web)
  const bustedSrc = currentSrc
    ? `${currentSrc}${currentSrc.includes('?') ? '&' : '?'}try=${idx}`
    : undefined;

  // Reset image attempt state when the row changes
  useEffect(() => {
    setIdx(0);
    setAllFailed(false);
  }, [item.id, item.name, item.imageUrl]);

  // Show spinner whenever we switch candidates (unless we've given up)
  useEffect(() => {
    if (!allFailed) setLoading(true);
  }, [bustedSrc, allFailed]);

  const handleOpen = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      // Add to owned tab
      onMarkPurchased(item.id);
    } else if (direction === 'right') {
      onToggleWanted(item.id);
    }
    requestAnimationFrame(() => swipeRef.current?.close());
  };

  // animated swipeable actions
  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.leftActionContainer}>
        <Animated.View style={[styles.leftAction, { transform: [{ scale }] }]}>
          <Text style={styles.actionIcon}>+</Text>
          <Text style={styles.actionLabel}>Add</Text>
        </Animated.View>
      </View>
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActionContainer}>
        <Animated.View style={[styles.rightAction, { transform: [{ scale }] }]}>
          <Text style={styles.actionIcon}>🗑️</Text>
          <Text style={styles.actionLabel}>Remove</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      friction={1.5}
      leftThreshold={40}
      rightThreshold={40}
      onSwipeableOpen={handleOpen}
      childrenContainerStyle={{ overflow: 'visible' }}
    >
      <View style={styles.rowWrap}>
        <View style={styles.rowCard}>
          <View style={styles.imageContainer}>
            {allFailed ? (
              // Local monogram fallback – no network images resolved
              <View style={styles.monogram}>
                <Text style={styles.monogramText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <>
                <ExpoImage
                  key={bustedSrc} // force remount when idx changes
                  source={{ uri: bustedSrc! }}
                  style={styles.ingredientImage}
                  contentFit="cover"
                  cachePolicy="none" // avoid persisting 404s
                  transition={100}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    if (idx < candidates.length - 1) {
                      setLoading(false);
                      setIdx((i) => i + 1);
                    } else {
                      setLoading(false);
                      setAllFailed(true);
                    }
                  }}
                />
                {loading && (
                  <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="small" color="#9C9CA3" />
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.rowTextWrap}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.rowSub} numberOfLines={1}>
              {item.category}
            </Text>
          </View>

          {/* Price Badge - now inside the row so it slides with content */}
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              {item.price && item.price > 0
                ? `$${item.price.toFixed(2)}`
                : '$0.00'}
            </Text>
          </View>

          <Pressable
            onPress={() => onToggleMenu(item.id)}
            accessibilityLabel="More actions"
            style={styles.menuButton}
          >
            <Text style={styles.menuDots}>⋯</Text>
          </Pressable>
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    position: 'relative',
    marginHorizontal: 6,
    marginVertical: 4,
    overflow: 'visible',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: Colors.buttonBackground,
    borderColor: '#232329',
    borderWidth: 1,
    borderRadius: 14,
  },
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#26262B',
    borderWidth: 1,
    borderColor: '#2C2C34',
    overflow: 'hidden',
    position: 'relative',
  },
  ingredientImage: { width: '100%', height: '100%' },
  monogram: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A30',
  },
  monogramText: { color: '#CFCFCF', fontSize: 18, fontWeight: '700' },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(38, 38, 43, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: { flex: 1, marginRight: 8, overflow: 'hidden' },
  rowTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  rowSub: {
    color: Colors.textSecondary ?? '#9BA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  // Price badge - inline with row content
  priceBadge: {
    backgroundColor: '#1E1E24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2C2C34',
    marginRight: 8,
  },
  priceText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '700',
  },
  menuButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A30',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.buttonBackground,
    zIndex: 5,
  },
  menuDots: {
    color: '#CFCFCF',
    fontSize: 18,
    lineHeight: 18,
    marginTop: -2,
    fontWeight: '800',
  },
  // Swipeable action containers
  leftActionContainer: {
    flex: 1,
    backgroundColor: '#1E8449',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    borderRadius: 14,
    marginVertical: 4,
  },
  rightActionContainer: {
    flex: 1,
    backgroundColor: '#C0392B',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    borderRadius: 14,
    marginVertical: 4,
  },
  leftAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});