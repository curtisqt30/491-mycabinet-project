import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';

// Base dimensions (designed for ~375px width)
const BASE_WIDTH = 375;
const BASE_PADDING = 16;
const BASE_GAP = 10;
const BASE_HEART_SIZE = 28;
const BASE_BORDER_RADIUS = 14;

// Minimums
const MIN_PADDING = 10;
const MIN_GAP = 6;
const MIN_HEART_SIZE = 24;

type SkeletonDimensions = {
  cardWidth: number;
  heartSize: number;
  heartOffset: number;
  borderRadius: number;
};

function useSkeletonDimensions(): SkeletonDimensions {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const scale = Math.min(width / BASE_WIDTH, 1.2);
    const smallScale = Math.max(0.7, scale);

    const padding = Math.max(MIN_PADDING, Math.round(BASE_PADDING * smallScale));
    const gap = Math.max(MIN_GAP, Math.round(BASE_GAP * smallScale));
    const heartSize = Math.max(MIN_HEART_SIZE, Math.round(BASE_HEART_SIZE * smallScale));
    const borderRadius = Math.round(BASE_BORDER_RADIUS * smallScale);
    const cardWidth = Math.floor((width - padding * 2 - gap) / 2);
    const heartOffset = Math.max(4, Math.round(8 * smallScale));

    return {
      cardWidth,
      heartSize,
      heartOffset,
      borderRadius,
    };
  }, [width]);
}

export default function SkeletonCard() {
  const dimensions = useSkeletonDimensions();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const cardStyle = useMemo(
    () => ({
      width: dimensions.cardWidth,
    }),
    [dimensions.cardWidth],
  );

  const thumbWrapStyle = useMemo(
    () => ({
      borderRadius: dimensions.borderRadius,
    }),
    [dimensions.borderRadius],
  );

  const heartBtnStyle = useMemo(
    () => ({
      width: dimensions.heartSize,
      height: dimensions.heartSize,
      borderRadius: dimensions.heartSize / 2,
      top: dimensions.heartOffset,
      right: dimensions.heartOffset,
    }),
    [dimensions.heartSize, dimensions.heartOffset],
  );

  return (
    <View style={[styles.card, cardStyle]}>
      <View style={[styles.thumbWrap, thumbWrapStyle]}>
        <Animated.View style={[styles.thumb, { opacity }]} />
        {/* Heart button skeleton */}
        <View style={[styles.heartBtn, heartBtnStyle]} />
      </View>
      {/* Name skeleton */}
      <View style={styles.nameContainer}>
        <Animated.View style={[styles.nameLine, { opacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // width set dynamically
  },
  thumbWrap: {
    overflow: 'hidden',
    backgroundColor: '#1d1d1d',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#2a2a2a',
  },
  heartBtn: {
    position: 'absolute',
    backgroundColor: '#2a2a2a',
  },
  nameContainer: {
    marginTop: 10,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  nameLine: {
    height: 14,
    borderRadius: 4,
    backgroundColor: '#2a2a2a',
    width: '80%',
  },
});