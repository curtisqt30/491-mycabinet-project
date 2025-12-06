import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { router, Link } from 'expo-router';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import FormButton from '@/components/ui/FormButton';

const { width, height } = Dimensions.get('window');

// Use any stock/royalty-free URLs you want.
// Tip: keep 3–5 per slide so you can rotate if one breaks.
const REMOTE = {
  discover: [
    // Unsplash cocktail heros (examples)
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1600',
    'https://images.unsplash.com/photo-1514362545857-3bc16bca6a09?q=80&w=1600',
  ],
  cabinet: [
    'https://images.unsplash.com/photo-1544978400-1b334d6c1d4b?q=80&w=1600',
    'https://images.unsplash.com/photo-1542834369-f10ebf06d3cb?q=80&w=1600',
  ],
  favorites: [
    'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?q=80&w=1600',
    'https://images.unsplash.com/photo-1560516824-eba9d6b43a3e?q=80&w=1600',
  ],
};

const SLIDES = [
  {
    key: 'discover',
    title: 'Discover Cocktails',
    subtitle: 'Search by name or ingredient',
    image: require('../../assets/images/discover.jpg'),
  },
  {
    key: 'cabinet',
    title: 'Build Your Cabinet',
    subtitle: 'Save what you own & get matches',
    image: require('../../assets/images/cabinet.jpg'),
  },
  {
    key: 'favorites',
    title: 'Pin Favorites',
    subtitle: 'Quick access to go-to drinks',
    image: require('../../assets/images/favorites.jpg'),
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [ctaH, setCtaH] = useState(88);
  const listRef = useRef<Animated.FlatList<any>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const chosen = useMemo(() => {
    return SLIDES.map((s) => {
      const pool = REMOTE[s.key as keyof typeof REMOTE] ?? [];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      return pick;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await Promise.all(
          chosen.filter(Boolean).map((u) => RNImage.prefetch(u)),
        );
      } catch {}
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [chosen]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length) {
      const i = viewableItems[0].index ?? 0;
      setIndex(i);
    }
  }).current;
  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 60 }),
    [],
  );

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      void done();
    }
  };

  const done = () => {
    router.replace('/(auth)/create-account');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip */}
      <View style={[styles.topBar, { top: Math.max(8, insets.top + 20) }]}>
        <TouchableOpacity
          onPress={done}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index: i }) => {
          const remoteUri = chosen[i];
          const src =
            item.image ?? (remoteUri ? { uri: remoteUri } : undefined);
          return (
            <View style={{ width, height }}>
              {src ? (
                <Image
                  source={src as any}
                  style={styles.bg}
                  contentFit="cover"
                  contentPosition={{ top: '25%', left: '50%' }}
                  cachePolicy="disk"
                />
              ) : null}
              <LinearGradient
                colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.85)']}
                style={StyleSheet.absoluteFillObject}
              />
              {!ready && (
                <View style={styles.loader}>
                  <ActivityIndicator />
                </View>
              )}
              <View
                style={[
                  styles.content,
                  {
                    bottom: (insets.bottom || 0) + ctaH + 24 + 56,
                    paddingHorizontal: 24,
                  },
                ]}
              >
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Animated dots */}
      <View
        style={[styles.dots, { bottom: (insets.bottom || 0) + ctaH + -12 }]}
      >
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const widthAnim = scrollX.interpolate({
            inputRange,
            outputRange: [8, 22, 8],
            extrapolate: 'clamp',
          });
          const opacityAnim = scrollX.interpolate({
            inputRange,
            outputRange: [0.35, 1, 0.35],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  width: widthAnim,
                  opacity: opacityAnim,
                },
              ]}
            />
          );
        })}
      </View>

      {/* CTAs */}
      <View
        style={[
          styles.ctaWrap,
          { paddingBottom: Math.max(insets.bottom + 16, 24) },
        ]}
        onLayout={(e) => setCtaH(e.nativeEvent.layout.height)}
      >
        <FormButton
          title={index === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={next}
        />
        <Text style={styles.haveAcct}>
          Already have an account?{' '}
          <Link href="/(auth)/login" asChild>
            <Text style={styles.link}>Sign in</Text>
          </Link>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: { position: 'absolute', right: 16, zIndex: 10 },
  skip: { color: Colors.textSecondary, fontSize: 14 },
  content: { position: 'absolute', left: 0, right: 0 },
  title: {
    color: Colors.textPrimary,
    fontSize: height < 700 ? 26 : 30,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: height < 700 ? 14 : 16,
    lineHeight: height < 700 ? 18 : 20,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: { height: 8, borderRadius: 6, backgroundColor: '#fff', opacity: 0.35 },
  ctaWrap: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 12,
  },
  haveAcct: { color: Colors.textSecondary, fontSize: 14 },
  link: { color: Colors.link, fontSize: 14 },
});
