import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import FormButton from '@/components/ui/FormButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/ui/BackButton';

const CODE_LEN = 6;

export default function VerifyResetCodeScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const normalizedEmail = useMemo(
    () => (email || '').toLowerCase().trim(),
    [email],
  );

  const [codes, setCodes] = useState<string[]>(Array(CODE_LEN).fill(''));
  const inputs = useRef<(TextInput | null)[]>([]);
  const codeString = useMemo(() => codes.join(''), [codes]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const setDigit = (idx: number, value: string) => {
    const v = value.replace(/\D/g, '');
    setCodes((prev) => {
      const nextCodes = [...prev];
      nextCodes[idx] = v.slice(-1);
      return nextCodes;
    });
    if (v && idx < CODE_LEN - 1) inputs.current[idx + 1]?.focus();
  };

  const onKeyPress = (idx: number, key: string) => {
    if (key === 'Backspace' && !codes[idx] && idx > 0)
      inputs.current[idx - 1]?.focus();
  };

  const continueNext = () => {
    if (!normalizedEmail || codeString.length !== CODE_LEN) {
      Alert.alert('Enter code', 'Please fill in the 6-digit code.');
      return;
    }
    // Pass the code forward; verification will occur during reset/complete.
    router.replace(
      `/(auth)/new-password?email=${encodeURIComponent(normalizedEmail)}&code=${encodeURIComponent(codeString)}`,
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.backWrap, { top: Math.max(14, insets.top) }]}>
        <BackButton />
      </View>
      <Text style={styles.title}>Enter reset code</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to {normalizedEmail || 'your email'}.
      </Text>

      <View style={styles.row}>
        {Array.from({ length: CODE_LEN }).map((_, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={codes[i]}
            onChangeText={(v) => setDigit(i, v)}
            onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={1}
            style={styles.box}
            returnKeyType={i === CODE_LEN - 1 ? 'done' : 'next'}
          />
        ))}
      </View>

      <FormButton
        title="Continue"
        onPress={continueNext}
        disabled={codeString.length !== CODE_LEN}
      />
    </View>
  );
}

const BOX = 50;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  row: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    textAlign: 'center',
    fontSize: 20,
    color: Colors.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  backWrap: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
  },
});
