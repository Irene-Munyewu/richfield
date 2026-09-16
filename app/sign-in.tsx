import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing, typography } from '../constants/theme';
import { ROLES, type Role } from '../types/profile';
import { RichfieldLogo } from '../components/RichfieldLogo';

type Mode = 'signIn' | 'signUp';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === 'signUp';

  // Gentle rise-and-fade entrance once the splash intro hands off to this
  // screen, so it doesn't feel like a hard cut.
  const formAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(formAnim, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  const formStyle = {
    opacity: formAnim,
    transform: [
      { translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
    ],
  };

  async function handleSubmit() {
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Email and password are required.');
      return;
    }
    if (isSignUp && !fullName.trim()) {
      Alert.alert('Missing info', 'Please enter your full name.');
      return;
    }
    if (isSignUp && !consent) {
      Alert.alert('Consent required', 'Please agree to the processing of your personal information to continue.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { role, full_name: fullName.trim(), consent: true } },
        });
        if (error) throw error;
        // A DB trigger (handle_new_user) creates the profiles row from
        // this metadata — see supabase/schema.sql.
        Alert.alert('Account created', 'Signed up successfully.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      // No explicit navigation needed: the root layout's Stack.Protected
      // guards react to the auth-state change and swap in the right
      // route group (tabs/business/admin) automatically.
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert(isSignUp ? 'Sign up failed' : 'Sign in failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Animated.View style={formStyle}>
        <View style={styles.brandBadge}>
          <RichfieldLogo size={26} />
        </View>
        <Text style={typography.h1}>Richfield Connect</Text>
        <Text style={styles.tagline}>Know your strength. Close your gaps. Get ahead.</Text>
        <Text style={[typography.bodyMuted, styles.subtitle]}>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </Text>

        {isSignUp && (
          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Jane Dlamini"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        {isSignUp && (
          <View style={styles.field}>
            <Text style={styles.label}>I am a...</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => {
                const selected = r.value === role;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => setRole(r.value)}
                    style={[styles.rolePill, selected && styles.rolePillSelected]}
                  >
                    <Text style={[styles.roleText, selected && styles.roleTextSelected]}>
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {isSignUp && (
          <Pressable style={styles.consentRow} onPress={() => setConsent((c) => !c)}>
            <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
              {consent && <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />}
            </View>
            <Text style={styles.consentText}>
              I agree to the processing of my personal information in line with POPIA.
            </Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={typography.button}>{isSignUp ? 'Sign up' : 'Sign in'}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => setMode(isSignUp ? 'signIn' : 'signUp')}
          style={styles.switchModeButton}
        >
          <Text style={styles.switchModeText}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </Text>
        </Pressable>

        {!isSignUp && (
          <Pressable onPress={() => router.push('/admin/login')} style={styles.switchModeButton}>
            <Text style={styles.switchModeText}>Admin? Sign in here</Text>
          </Pressable>
        )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  brandBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tagline: { ...typography.caption, color: colors.primary, fontWeight: '700', marginTop: 2, marginBottom: spacing.md },
  subtitle: { marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  label: { ...typography.caption, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 15,
    color: colors.text,
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rolePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  rolePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleText: { ...typography.body, fontWeight: '600' },
  roleTextSelected: { color: colors.textOnPrimary },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.sm },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  consentText: { ...typography.bodyMuted, flex: 1 },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonDisabled: { opacity: 0.6 },
  switchModeButton: { marginTop: spacing.lg, alignItems: 'center' },
  switchModeText: { ...typography.bodyMuted, color: colors.primary, fontWeight: '600' },
});
