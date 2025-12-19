import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, Link, type Href } from 'expo-router';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';

// Define the type for each navigation item
type Item = {
  icon: keyof typeof Ionicons.glyphMap;
  route: Href;
  href?: Href;
  match?: (path: string) => boolean;
};

// Define the props for the BottomNav component
type Props = {
  items: Item[];
  height?: number;
  safeArea?: boolean;
};

// size of the red dot indicator
const DOT = 6;

// Bottom navigation bar with animated indicator
export default function BottomNav({
  items,
  height = 64,
  safeArea = true,
}: Props) {
  const pathname = usePathname();

  const matchedIndex = Math.max(
    0,
    items.findIndex((it) =>
      it.match
        ? it.match(pathname ?? '')
        : (pathname ?? '').startsWith(String(it.route)),
    ),
  );

  const [barW, setBarW] = useState(0);
  const [index, setIndex] = useState(matchedIndex);
  const animIndex = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    if (matchedIndex !== index) setIndex(matchedIndex);
  }, [matchedIndex, index]);

  // animate the red dot to the new index
  useEffect(() => {
    Animated.spring(animIndex, {
      toValue: index,
      useNativeDriver: false,
      bounciness: 10,
      speed: 14,
    }).start();
  }, [index, animIndex]);

  const tabWidthPct = useMemo(
    () => (items.length > 0 ? 100 / items.length : 100),
    [items],
  );
  const tabW = useMemo(
    () => (barW && items.length ? barW / items.length : 0),
    [barW, items],
  );
  const centers = useMemo(
    () => (tabW ? items.map((_, i) => i * tabW + tabW / 2) : []),
    [tabW, items],
  );
  const canAnimate = centers.length >= 2;

  const outputRange = centers.map((c) => (c ? c - DOT / 2 : 0));
  const leftValue = canAnimate
    ? animIndex.interpolate({
        inputRange: centers.map((_, i) => i),
        outputRange,
      })
    : (centers[index] ?? 0) - DOT / 2;

  const ripple =
    Platform.OS === 'android'
      ? { color: `${Colors.accentPrimary}33`, borderless: true }
      : undefined;

  // the navigation bar
  const Bar = (
    <View
      onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
      style={StyleSheet.flatten([
        styles.bar,
        { height, backgroundColor: Colors.buttonBackground },
      ])}
    >
      {/* red dot */}
      {barW > 0 && (
        <Animated.View
          style={StyleSheet.flatten([
            styles.dot,
            { left: leftValue, backgroundColor: Colors.textRed },
          ])}
        />
      )}

      {items.map((it, i) => {
        const active = i === index;
        const iconName =
          active && String(it.icon).endsWith('-outline')
            ? (String(it.icon).replace('-outline', '') as any)
            : it.icon;
        const href: Href = it.href ?? it.route;

        return (
          <Link key={`${String(it.route)}-${i}`} href={href} asChild>
            <Pressable
              style={StyleSheet.flatten([
                styles.tab,
                { width: `${tabWidthPct}%`, height },
              ])}
              android_ripple={ripple}
              onPressIn={() => setIndex(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={String(iconName)}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={active ? Colors.textPrimary : Colors.textSecondary}
              />
            </Pressable>
          </Link>
        );
      })}
    </View>
  );

  if (!safeArea) return <View style={styles.wrap}>{Bar}</View>;
  return <SafeAreaView style={styles.wrap}>{Bar}</SafeAreaView>;
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 0,
    paddingBottom: Platform.OS === 'android' ? 10 : 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    bottom: 6,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
});
