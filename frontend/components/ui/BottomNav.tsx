import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';

type Item = {
  icon: keyof typeof Ionicons.glyphMap;
  route: Href;
  href?: Href;
  match?: (path: string) => boolean;
};

type Props = {
  items: Item[];
  height?: number;
  safeArea?: boolean;
};

const DOT = 6;

export default function BottomNav({
  items,
  height = 64,
  safeArea = true,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

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

  return (
    <View
      onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
      style={[styles.bar, { height, backgroundColor: Colors.buttonBackground }]}
    >
      {barW > 0 && (
        <Animated.View
          style={[styles.dot, { left: leftValue, backgroundColor: Colors.textRed }]}
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
          <Pressable
            key={`${String(it.route)}-${i}`}
            style={[styles.tab, { width: `${tabWidthPct}%`, height }]}
            onPress={() => {
              setIndex(i);
              router.push(href);
            }}
          >
            <Ionicons
              name={iconName}
              size={22}
              color={active ? Colors.textPrimary : Colors.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    overflow: 'hidden',
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