import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';

// Checkbox component with label
export default function CheckBox({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        if (!disabled) {
          onChange(!checked);
        }
      }}
      style={[styles.row, disabled && styles.rowDisabled]}
      hitSlop={10}
      disabled={disabled}
    >
      <View
        style={[
          styles.box,
          checked && styles.boxChecked,
          disabled && styles.boxDisabled,
        ]}
      >
        {checked ? <Text style={styles.check}>✓</Text> : null}
      </View>
      {label ? (
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  boxChecked: {
    backgroundColor: Colors.textPrimary,
  },
  boxDisabled: {},
  check: {
    color: Colors.background,
    fontSize: 14,
    lineHeight: 14,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  labelDisabled: {},
});
