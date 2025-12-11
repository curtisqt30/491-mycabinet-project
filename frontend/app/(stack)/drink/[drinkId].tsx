import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  UIManager,
  Pressable,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  useSafeAreaInsets,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/ui/BackButton';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import { getDetailsById, type CocktailDetails } from '@/app/lib/cocktails';
import { useFavorites } from '@/app/lib/useFavorites';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// naive step-splitter for strInstructions → bullets
function toSteps(instr?: string | null): string[] {
  if (!instr) return [];
  return instr
    .split(/\.\s+|\n+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.endsWith('.') ? s.slice(0, -1) : s));
}

export default function DrinkDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { drinkId, name, thumbUrl } = useLocalSearchParams<{
    drinkId?: string;
    name?: string;
    thumbUrl?: string;
  }>();

  const { items: favItems, toggle } = useFavorites();
  const favIds = React.useMemo(
    () => new Set((favItems ?? []).map((f) => f.id)),
    [favItems],
  );
  const isFav = drinkId ? favIds.has(String(drinkId)) : false;

  const [drink, setDrink] = React.useState<CocktailDetails | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(!!drinkId);

  // Fetch full details by ID (hydrates ingredients + instructions)
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      if (!drinkId) return;
      try {
        setLoading(true);
        const details = await getDetailsById(drinkId);
        if (!alive) return;
        setDrink(details);
        setErr(details ? null : 'Not found');
        if (__DEV__ && details && name && details.strDrink !== name) {
          console.warn(
            `Route name (${name}) != API name (${details.strDrink}) for id ${drinkId}`,
          );
        }
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Failed to load drink');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [drinkId, name]);

  const title = drink?.strDrink || name || 'Drink Details';
  const heroSrc =
    drink?.strDrinkThumb ||
    thumbUrl ||
    'https://www.thecocktaildb.com/images/media/drink/metwgh1606770327.jpg';

  const steps = toSteps(drink?.strInstructions);
  const ingredients = drink?.ingredients ?? [];

  const onToggleFav = () => {
    if (!drinkId) return;
    void toggle({ id: String(drinkId), name: title, thumbUrl: heroSrc });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Make sure back button is always tappable and above content */}
      <View
        style={[styles.backWrap, { top: Math.max(14, insets.top) }]}
        pointerEvents="box-none"
      >
        <BackButton />
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Reserve space for back button so long titles don't overlap */}
        <View
          style={[
            styles.headerWrap,
            { paddingTop: 56, paddingLeft: 56, paddingRight: 16 },
          ]}
        >
          <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
            {title}
          </Text>
          {!!drink?.strCategory && (
            <Text style={styles.subtitle}>{drink.strCategory}</Text>
          )}
          {!drink?.strCategory && !!drinkId && (
            <Text style={styles.subtitle}>ID: {drinkId}</Text>
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO */}
          <View style={styles.heroCard}>
            <Image
              source={{ uri: heroSrc }}
              style={styles.heroImage}
              contentFit="cover"
              transition={100}
            />
            <Pressable
              onPress={onToggleFav}
              hitSlop={12}
              style={styles.heartBtn}
            >
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={22}
                color={isFav ? '#FF6B6B' : (Colors.textPrimary as string)}
              />
            </Pressable>
            <View style={styles.heroTitlePill}>
              <Text numberOfLines={1} style={styles.heroTitleText}>
                {title}
              </Text>
            </View>
          </View>

          {/* STATUS / ERRORS */}
          {loading && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Loading recipe…</Text>
            </View>
          )}
          {!!err && !loading && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Couldn’t load drink: {err}</Text>
              <Text style={styles.infoTextSmall}>
                Tip: The API may be rate-limited. Pull to refresh, or try again
                in a moment.
              </Text>
            </View>
          )}

          {/* INGREDIENTS */}
          {ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {ingredients.map((it, idx) => (
                <View
                  key={`${it.ingredient}-${idx}`}
                  style={styles.ingredientRow}
                >
                  <Ionicons
                    name="ellipse"
                    size={6}
                    color={Colors.textSecondary ?? '#9BA3AF'}
                    style={{ marginTop: 8, marginRight: 8 }}
                  />
                  <Text style={styles.ingredientText}>
                    <Text style={styles.ingredientName}>{it.ingredient}</Text>
                    {it.measure ? (
                      <Text style={styles.ingredientMeasure}>
                        {' '}
                        — {it.measure}
                      </Text>
                    ) : null}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* STEPS */}
          {steps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              {steps.map((s, i) => (
                <View key={`step-${i}`} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{s}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Fallback if no details available */}
          {!loading &&
            !err &&
            ingredients.length === 0 &&
            steps.length === 0 && (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>
                  Full recipe details will appear here once loaded.
                </Text>
              </View>
            )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const RADIUS = 18;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  backWrap: { position: 'absolute', left: 14, zIndex: 20, elevation: 20 },
  headerWrap: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary ?? '#9BA3AF',
  },
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 140 },

  heroCard: {
    marginTop: 8,
    borderRadius: RADIUS,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.cardBackground ?? '#1A1921',
  },
  heroImage: { width: '100%', aspectRatio: 4 / 5, borderRadius: RADIUS },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroTitlePill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroTitleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },

  section: {
    marginTop: 18,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder ?? '#2C2A35',
    backgroundColor: Colors.buttonBackground,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 10,
  },

  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  ingredientText: { color: Colors.textPrimary, fontSize: 14, flexShrink: 1 },
  ingredientName: { fontWeight: '700' },
  ingredientMeasure: { color: Colors.textSecondary, fontWeight: '500' },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    marginRight: 10,
    marginTop: 2,
  },
  stepBadgeText: { color: Colors.textPrimary, fontWeight: '800', fontSize: 12 },
  stepText: { color: Colors.textPrimary, fontSize: 14, flex: 1 },

  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.cardBackground ?? '#1A1921',
  },
  infoText: { color: Colors.textSecondary ?? '#9BA3AF' },
  infoTextSmall: {
    color: Colors.textSecondary ?? '#9BA3AF',
    fontSize: 12,
    marginTop: 6,
  },

  placeholderBox: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder ?? '#2C2A35',
    backgroundColor: Colors.buttonBackground,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: Colors.textSecondary ?? '#9BA3AF' },
});
