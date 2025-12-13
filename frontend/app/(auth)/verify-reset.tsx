import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import FormButton from '@/components/ui/FormButton';

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
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
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
                  onKeyPress={({ nativeEvent }) =>
                    onKeyPress(i, nativeEvent.key)
                  }
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

            <Text style={styles.cancel} onPress={() => router.back()}>
              Cancel
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const BOX_SIZE = 50;

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 60,
  },
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    textAlign: 'center',
    fontSize: 20,
    color: Colors.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cancel: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
