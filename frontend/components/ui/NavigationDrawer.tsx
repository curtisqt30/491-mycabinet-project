import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/app/lib/AuthContext';

type MenuItem = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  route?: string;
  onPress?: () => void;
  danger?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

const DRAWER_WIDTH = 280;
const ANIMATION_DURATION = 280;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MENU_ITEMS: MenuItem[] = [
  { label: 'Search', icon: 'search-outline', route: '/search' },
  { label: 'My Cabinet', icon: 'cube-outline', route: '/cabinet' },
  { label: 'Favorites', icon: 'heart-outline', route: '/favorites' },
  { label: 'Recommendations', icon: 'sparkles-outline', route: '/assistant' },
  { label: 'Settings', icon: 'settings-outline', route: '/(stack)/settings' },
  { label: 'Sign Out', icon: 'log-out-outline', danger: true },
];

export default function NavigationDrawer({ visible, onClose }: Props) {
  const { logout } = useAuth();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Handle open/close animations
  useEffect(() => {
    if (visible) {
      // Show modal first, then animate in
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out, then hide modal
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleSignOut = async () => {
    setConfirmSignOut(false);
    onClose();

    try {
      // Call the real logout from AuthContext
      await logout();
      // AuthGuard will automatically redirect to login
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if API call fails, logout() clears local state
      // so user will be redirected to login
    }
  };

  const handleItemPress = (item: MenuItem) => {
    if (item.label === 'Sign Out') {
      setConfirmSignOut(true);
      return;
    }

    onClose();
    if (item.route) {
      // Small delay to let drawer close animation start
      setTimeout(() => {
        router.push(item.route as any);
      }, 100);
    } else if (item.onPress) {
      item.onPress();
    }
  };

  const handleBackdropPress = () => {
    if (!confirmSignOut) {
      onClose();
    }
  };

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Animated backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleBackdropPress}
          >
            <BlurView
              intensity={20}
              style={StyleSheet.absoluteFill}
              tint="dark"
            />
          </Pressable>
        </Animated.View>

        {/* Animated drawer */}
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Close button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>

          {/* Menu items */}
          <ScrollView
            style={styles.menuList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.menuContent}
          >
            {MENU_ITEMS.map((item, index) => (
              <Pressable
                key={index}
                onPress={() => handleItemPress(item)}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                {item.icon && (
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={item.danger ? Colors.textRed : Colors.textPrimary}
                    style={styles.menuIcon}
                  />
                )}
                <Text
                  style={[
                    styles.menuText,
                    item.danger && styles.menuTextDanger,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      </View>

      <ConfirmDialog
        visible={confirmSignOut}
        title="Sign Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => void handleSignOut()}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.buttonBackground,
    paddingTop: 60,
    paddingHorizontal: 20,
    // Add shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.buttonBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginLeft: 4,
  },
  closeButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  menuList: {
    flex: 1,
  },
  menuContent: {
    paddingBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  menuItemPressed: {
    backgroundColor: Colors.buttonBackground,
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  menuTextDanger: {
    color: Colors.textRed,
  },
  footer: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    opacity: 0.6,
  },
});
