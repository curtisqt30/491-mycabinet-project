import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';

// Blurhash placeholder - a nice gray gradient
const PLACEHOLDER_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

// Base dimensions (designed for ~375px width - iPhone SE/mini)
const BASE_WIDTH = 375;
const BASE_PADDING = 16;
const BASE_GAP = 10;
const BASE_FONT_SIZE = 13;
const BASE_CARD_PADDING = 10;
const BASE_HEART_SIZE = 28;
const BASE_HEART_ICON = 18;
const BASE_BORDER_RADIUS = 14;

// Minimum dimensions to prevent things getting too tiny
const MIN_PADDING = 10;
const MIN_GAP = 6;
const MIN_FONT_SIZE = 11;
const MIN_CARD_PADDING = 6;
const MIN_HEART_SIZE = 24;
const MIN_HEART_ICON = 14;

export type CocktailItem = {
  id: string | number;
  name: string;
  thumbUrl: string | null;
  isFavorite?: boolean;
};

type Props = {
  data: CocktailItem[];
  onPressItem: (id: string | number) => void;
  onToggleFavorite?: (id: string | number, next: boolean) => void;
  bottomPad?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
};

type CardDimensions = {
  cardWidth: number;
  padding: number;
  gap: number;
  fontSize: number;
  cardPadding: number;
  heartSize: number;
  heartIcon: number;
  borderRadius: number;
};

// Calculate responsive dimensions based on screen width
function useResponsiveDimensions(): CardDimensions {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    // Scale factor based on screen width (1.0 at 375px)
    const scale = Math.min(width / BASE_WIDTH, 1.2); // Cap at 1.2x for large screens
    const smallScale = Math.max(0.7, scale); // Floor at 0.7x for tiny screens

    // Calculate scaled dimensions with min/max bounds
    const padding = Math.max(MIN_PADDING, Math.round(BASE_PADDING * smallScale));
    const gap = Math.max(MIN_GAP, Math.round(BASE_GAP * smallScale));
    const fontSize = Math.max(MIN_FONT_SIZE, Math.round(BASE_FONT_SIZE * smallScale));
    const cardPadding = Math.max(MIN_CARD_PADDING, Math.round(BASE_CARD_PADDING * smallScale));
    const heartSize = Math.max(MIN_HEART_SIZE, Math.round(BASE_HEART_SIZE * smallScale));
    const heartIcon = Math.max(MIN_HEART_ICON, Math.round(BASE_HEART_ICON * smallScale));
    const borderRadius = Math.round(BASE_BORDER_RADIUS * smallScale);

    // Card width: (screen - 2*padding - gap) / 2
    const cardWidth = Math.floor((width - padding * 2 - gap) / 2);

    return {
      cardWidth,
      padding,
      gap,
      fontSize,
      cardPadding,
      heartSize,
      heartIcon,
      borderRadius,
    };
  }, [width]);
}

// Memoized card component with dynamic dimensions
const CocktailCard = React.memo(function CocktailCard({
  item,
  onPress,
  onToggleFavorite,
  dimensions,
}: {
  item: CocktailItem;
  onPress: () => void;
  onToggleFavorite?: () => void;
  dimensions: CardDimensions;
}) {
  const cardStyle = useMemo(
    () => ({
      width: dimensions.cardWidth,
      borderRadius: dimensions.borderRadius,
    }),
    [dimensions.cardWidth, dimensions.borderRadius],
  );

  const heartBtnStyle = useMemo(
    () => ({
      width: dimensions.heartSize,
      height: dimensions.heartSize,
      borderRadius: dimensions.heartSize / 2,
      top: Math.max(4, dimensions.cardPadding - 2),
      right: Math.max(4, dimensions.cardPadding - 2),
    }),
    [dimensions.heartSize, dimensions.cardPadding],
  );

  const nameStyle = useMemo(
    () => ({
      fontSize: dimensions.fontSize,
      padding: dimensions.cardPadding,
      paddingTop: dimensions.cardPadding - 2,
    }),
    [dimensions.fontSize, dimensions.cardPadding],
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        cardStyle,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.imageContainer, { borderRadius: dimensions.borderRadius }]}>
        <Image
          source={{ uri: item.thumbUrl || undefined }}
          style={styles.image}
          contentFit="cover"
          placeholder={PLACEHOLDER_BLURHASH}
          placeholderContentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={item.id.toString()}
        />

        {/* Favorite button overlay */}
        {onToggleFavorite && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            style={[styles.favoriteButton, heartBtnStyle]}
            hitSlop={8}
          >
            <Ionicons
              name={item.isFavorite ? 'heart' : 'heart-outline'}
              size={dimensions.heartIcon}
              color={item.isFavorite ? '#ff4d6d' : Colors.textPrimary}
            />
          </Pressable>
        )}
      </View>

      <Text style={[styles.name, nameStyle]} numberOfLines={2}>
        {item.name}
      </Text>
    </Pressable>
  );
});

export default function CocktailGrid({
  data,
  onPressItem,
  onToggleFavorite,
  bottomPad = 100,
  refreshing = false,
  onRefresh,
}: Props) {
  const dimensions = useResponsiveDimensions();

  const renderItem = useCallback(
    ({ item }: { item: CocktailItem }) => (
      <CocktailCard
        item={item}
        onPress={() => onPressItem(item.id)}
        onToggleFavorite={
          onToggleFavorite
            ? () => onToggleFavorite(item.id, !item.isFavorite)
            : undefined
        }
        dimensions={dimensions}
      />
    ),
    [onPressItem, onToggleFavorite, dimensions],
  );

  const keyExtractor = useCallback(
    (item: CocktailItem) => item.id.toString(),
    [],
  );

  const containerStyle = useMemo(
    () => ({
      paddingHorizontal: dimensions.padding,
      paddingTop: 8,
      paddingBottom: bottomPad,
    }),
    [dimensions.padding, bottomPad],
  );

  const rowStyle = useMemo(
    () => ({
      justifyContent: 'space-between' as const,
      marginBottom: dimensions.gap,
    }),
    [dimensions.gap],
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={2}
      columnWrapperStyle={rowStyle}
      contentContainerStyle={containerStyle}
      showsVerticalScrollIndicator={false}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={8}
      windowSize={5}
      initialNumToRender={6}
      // Pull to refresh
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.textSecondary}
            colors={[Colors.accentPrimary]}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.buttonBackground,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});