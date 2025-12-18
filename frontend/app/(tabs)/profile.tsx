import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import FormButton from '@/components/ui/FormButton';
import MenuButton from '@/components/ui/MenuButton';
import NavigationDrawer from '@/components/ui/NavigationDrawer';
import { useAuth } from '@/app/lib/AuthContext';
import { useFavorites } from '@/app/lib/useFavorites';

// Default avatar when user hasn't set one
const DEFAULT_AVATAR =
  'https://api.dicebear.com/7.x/avataaars/png?seed=default';

export default function ProfileScreen() {
  // ✅ SAFETY: fallback for Jest
const insets =
  useSafeAreaInsets?.() ?? { top: 0, bottom: 0, left: 0, right: 0 };

  const { user } = useAuth();
  const { items: favorites } = useFavorites();

  const [drawerVisible, setDrawerVisible] = useState(false);

  const avatarUrl = user?.avatar_url || DEFAULT_AVATAR;
  const displayName =
    user?.display_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';

  // Menu handlers
  const handleMenuPress = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  const handleSettingsPress = useCallback(() => {
    router.push('/(stack)/settings');
  }, []);

  return (
    <View style={styles.screen}>
      {/* Top-left menu button overlay */}
      <View style={[styles.menuWrap, { top: insets.top + 10 }]}>
        <MenuButton onPress={handleMenuPress} />
      </View>

      {/* Top-right settings button overlay */}
      <Pressable
        style={[styles.settingsWrap, { top: insets.top + 10 }]}
        onPress={handleSettingsPress}
        hitSlop={8}
      >
        <Ionicons
          name="settings-outline"
          size={26}
          color={Colors.textPrimary}
        />
      </Pressable>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 56, flexGrow: 1 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{email}</Text>

          <FormButton
            title="Edit Profile"
            onPress={() => router.push('/(tabs)/user-profile/edit')}
            style={{ marginTop: 16, width: 160 }}
            textStyle={{ fontSize: 14 }}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{favorites?.length || 0}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>

        {/* Favorite Drinks */}
        <View style={styles.card}>
          <View style={styles.rowSpace}>
            <Text style={styles.sectionTitle}>Favorite Drinks</Text>
            {favorites && favorites.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/favorites')}
              >
                <Text style={styles.link}>See all</Text>
              </TouchableOpacity>
            )}
          </View>

          {!favorites || favorites.length === 0 ? (
            <Text style={styles.emptyText}>
              No favorites yet. Start exploring drinks!
            </Text>
          ) : (
            <View style={styles.favoritesPreview}>
              {favorites.slice(0, 4).map((fav) => (
                <TouchableOpacity
                  key={fav.id}
                  style={styles.favoriteThumb}
                  onPress={() =>
                    router.push({
                      pathname: '/drink/[drinkId]',
                      params: { 
                        drinkId: fav.id, 
                        name: fav.name,
                        thumbUrl: fav.thumbUrl 
                      },
                    })
                  }
                >
                  <Image
                    source={{
                      uri: fav.thumbUrl || 'https://via.placeholder.com/60',
                    }}
                    style={styles.favoriteImage}
                  />
                  <Text style={styles.favoriteName} numberOfLines={1}>
                    {fav.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Navigation drawer */}
      <NavigationDrawer visible={drawerVisible} onClose={handleCloseDrawer} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  menuWrap: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
  },
  settingsWrap: {
    position: 'absolute',
    right: 14,
    zIndex: 10,
    padding: 4,
  },
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 44 },

  // Header
  header: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
  },
  email: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.buttonBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Cards
  card: {
    backgroundColor: Colors.buttonBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  rowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  link: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  emptyText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },

  // Favorites preview
  favoritesPreview: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  favoriteThumb: {
    alignItems: 'center',
    width: 70,
  },
  favoriteImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  favoriteName: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },

  // Action rows
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  actionText: {
    color: Colors.textPrimary,
    fontSize: 15,
  },
  actionArrow: {
    color: Colors.textSecondary,
    fontSize: 20,
  },
});