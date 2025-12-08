import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';

type Props = {
  onPress: () => void;
};

// A hamburger menu button component to open the navigation drawer
export default function MenuButton({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      hitSlop={12}
      style={styles.container}
    >
      <Ionicons name="menu" size={24} color={Colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 999,
  },
});
