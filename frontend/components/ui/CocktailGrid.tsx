import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

// Blurhash placeholder - a nice gray gradient
const PLACEHOLDER_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

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

// Memoized card component to prevent unnecessary re-renders
const CocktailCard = React.memo(function CocktailCard({
  item,
  onPress,
  onToggleFavorite,
}: {
  item: CocktailItem;
  onPress: () => void;
  onToggleFavorite?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.imageContainer}>
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
            style={styles.favoriteButton}
            hitSlop={8}
          >
            <Ionicons
              name={item.isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={item.isFavorite ? '#ff4d6d' : Colors.textPrimary}
            />
          </Pressable>
        )}
      </View>
      
      <Text style={styles.name} numberOfLines={2}>
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
      />
    ),
    [onPressItem, onToggleFavorite]
  );

  const keyExtractor = useCallback(
    (item: CocktailItem) => item.id.toString(),
    []
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: bottomPad },
      ]}
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
  container: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 16,
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
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    padding: 12,
    paddingTop: 10,
  },
});