import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { ToastProvider } from '../lib/toast-context';
import { SplashIntro } from '../components/SplashIntro';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" animated />
      <ToastProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, profile, initializing } = useAuth();
  const [showIntro, setShowIntro] = useState(true);

  // First auth check on cold start — session persists via AsyncStorage so
  // this only shows briefly, not on every app open. The brand intro plays
  // over the top of it regardless of how long the auth check takes, so the
  // presenter always sees a deliberate animated arrival rather than a bare
  // spinner or a hard cut to the sign-in form.
  if (initializing || showIntro) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {initializing && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}
        {showIntro && <SplashIntro onFinish={() => setShowIntro(false)} />}
      </View>
    );
  }

  const role = profile?.role;

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="admin/login" />
        </Stack.Protected>

        {/* Student + alumni share the 5-tab shell (Home/Career/Jobs/Network/Profile).
            Content varies by role inside those screens as later phases build them out. */}
        <Stack.Protected guard={!!session && (role === 'student' || role === 'alumni')}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>

        <Stack.Protected guard={!!session && role === 'business' && profile?.business_status === 'approved'}>
          <Stack.Screen name="business" />
        </Stack.Protected>

        <Stack.Protected guard={!!session && role === 'business' && profile?.business_status !== 'approved'}>
          <Stack.Screen name="business-pending" />
        </Stack.Protected>

        <Stack.Protected guard={!!session && role === 'admin'}>
          <Stack.Screen name="admin/index" />
          <Stack.Screen name="admin/analytics" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}
