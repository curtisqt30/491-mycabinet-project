import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';

type PasswordRulesProps = {
  password: string;
  confirmPassword: string;
  email?: string;
  compactWhenSatisfied?: boolean;
};

const MIN_LEN = 10;

const COMMON_HINTS = [
  'password',
  'password1',
  'password12',
  'password123',
  '123456',
  'qwerty',
  'letmein',
  'welcome',
];

export default function PasswordRules({
  password,
  confirmPassword,
  email,
  compactWhenSatisfied = true,
}: PasswordRulesProps) {
  const checks = useMemo(() => {
    const lenOK = password.length >= MIN_LEN;
    const emailPart = (email ?? '').split('@', 1)[0].toLowerCase().trim();
    const containsEmail =
      !!emailPart && password.toLowerCase().includes(emailPart);

    const uniqueChars = new Set(password.toLowerCase());
    const notTooRepetitive = uniqueChars.size >= 3;
    const notHintCommon = !COMMON_HINTS.includes(password.toLowerCase().trim());
    const match = confirmPassword.length > 0 && password === confirmPassword;

    const allOK = lenOK && !containsEmail && notTooRepetitive && match;

    return {
      lenOK,
      containsEmail,
      notTooRepetitive,
      notHintCommon,
      match,
      allOK,
    };
  }, [password, confirmPassword, email]);

  const Rule = ({
    ok,
    label,
    warn = false,
  }: {
    ok: boolean;
    label: string;
    warn?: boolean;
  }) => (
    <View style={styles.ruleRow}>
      <View style={[styles.bullet, ok ? styles.bulletOk : styles.bulletNot]} />
      <Text
        style={[
          styles.ruleText,
          ok ? styles.textOk : warn ? styles.textWarn : styles.textNot,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );

  if (compactWhenSatisfied && checks.allOK) {
    return (
      <View style={styles.wrap} accessibilityLabel="Password requirements">
        <Text style={styles.header}>Password looks good ✅</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityLabel="Password requirements">
      <Text style={styles.header}>Password must:</Text>
      <Rule ok={checks.lenOK} label={`Be at least ${MIN_LEN} characters`} />
      {typeof email === 'string' && email.length > 0 && (
        <Rule
          ok={!checks.containsEmail}
          label="Not contain your email name"
          warn
        />
      )}
      <Rule
        ok={checks.notTooRepetitive}
        label="Avoid repeating a single character"
      />
      <Rule
        ok={checks.notHintCommon}
        label="Avoid super-common passwords"
        warn
      />
      <Rule ok={checks.match} label="Match in both fields" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: -2,
    paddingVertical: 4,
    alignSelf: 'stretch',
  },
  header: { color: Colors.textSecondary, fontSize: 13, marginBottom: 4 },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  bullet: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 2,
  },
  bulletOk: { backgroundColor: Colors.accentPrimary, borderColor: Colors.link },
  bulletNot: { backgroundColor: 'transparent', borderColor: '#5A585F' },
  ruleText: { fontSize: 12, flexShrink: 1 },
  textOk: { color: Colors.link },
  textNot: { color: '#C5C5C5' },
  textWarn: { color: '#E4C566' },
});
