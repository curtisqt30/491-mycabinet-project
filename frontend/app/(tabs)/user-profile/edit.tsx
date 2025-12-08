import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import BackButton from '@/components/ui/BackButton';
import FormButton from '@/components/ui/FormButton';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import { useAuth } from '@/app/lib/AuthContext';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE ??
  'http://127.0.0.1:8000/api/v1';

// Avatar options for selection
const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/avataaars/png?seed=felix',
  'https://api.dicebear.com/7.x/avataaars/png?seed=aneka',
  'https://api.dicebear.com/7.x/avataaars/png?seed=bailey',
  'https://api.dicebear.com/7.x/avataaars/png?seed=charlie',
  'https://api.dicebear.com/7.x/avataaars/png?seed=dusty',
  'https://api.dicebear.com/7.x/avataaars/png?seed=ginger',
  'https://api.dicebear.com/7.x/avataaars/png?seed=midnight',
  'https://api.dicebear.com/7.x/avataaars/png?seed=sunrise',
];

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const { user, accessToken, refreshUser } = useAuth();

  // Initialize form state from current user data
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(
    user?.avatar_url || AVATAR_OPTIONS[0],
  );
  const [saving, setSaving] = useState(false);

  const displayNameTrimmed = displayName.trim();
  const displayNameValid =
    displayNameTrimmed.length >= 1 && displayNameTrimmed.length <= 100;

  // Check if anything changed
  const hasChanges =
    displayNameTrimmed !== (user?.display_name || '') ||
    selectedAvatar !== (user?.avatar_url || AVATAR_OPTIONS[0]);

  const handleSave = async () => {
    if (!displayNameValid || saving) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          display_name: displayNameTrimmed,
          avatar_url: selectedAvatar,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || 'Failed to save profile');
      }

      // Refresh user data in context
      await refreshUser();

      Alert.alert('Success', 'Your profile has been updated!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back button */}
      <View style={[styles.backWrap, { top: insets.top + 10 }]}>
        <BackButton />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 56 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your public info</Text>
        </View>

        {/* Avatar Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Profile Picture</Text>
          <View style={styles.avatarSection}>
            <Image source={{ uri: selectedAvatar }} style={styles.mainAvatar} />
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((url) => (
                <TouchableOpacity
                  key={url}
                  onPress={() => setSelectedAvatar(url)}
                  style={[
                    styles.avatarOption,
                    selectedAvatar === url && styles.avatarOptionSelected,
                  ]}
                >
                  <Image source={{ uri: url }} style={styles.avatarThumb} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Display Name Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Display Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="What should we call you?"
            placeholderTextColor={Colors.textSecondary}
            style={styles.input}
            maxLength={100}
            autoCapitalize="words"
            editable={!saving}
          />
          <View style={styles.inputFooter}>
            {!displayNameValid && displayName.length > 0 && (
              <Text style={styles.errorText}>
                Name is required (1-100 chars)
              </Text>
            )}
            <Text style={styles.charCount}>
              {displayNameTrimmed.length}/100
            </Text>
          </View>
        </View>

        {/* Email (read-only) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Email</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{user?.email}</Text>
          </View>
          <Text style={styles.helperText}>Email cannot be changed</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <FormButton
            title={saving ? 'Saving...' : 'Save Changes'}
            onPress={() => void handleSave()}
            disabled={!displayNameValid || !hasChanges || saving}
          />
          {saving && <ActivityIndicator style={{ marginTop: 12 }} />}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backWrap: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },

  // Avatar selection
  avatarSection: {
    alignItems: 'center',
  },
  mainAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    marginBottom: 16,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  avatarOption: {
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  avatarOptionSelected: {
    borderColor: Colors.link,
  },
  avatarThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
  },

  // Inputs
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 'auto',
  },
  errorText: {
    fontSize: 12,
    color: '#ff6b6b',
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
  },

  // Read-only field
  readOnlyField: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  readOnlyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },

  // Actions
  actions: {
    marginTop: 16,
  },

  // Cancel button styles
  cancelButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
