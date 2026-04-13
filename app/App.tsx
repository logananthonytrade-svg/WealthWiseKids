import 'react-native-gesture-handler';
import React, { useEffect, useRef, Component } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, ActivityIndicator, StyleSheet, StatusBar, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import useAuthStore from './src/store/authStore';
import AuthNavigator from './src/navigation/AuthNavigator';
import ParentNavigator from './src/navigation/ParentNavigator';
import StudentNavigator from './src/navigation/StudentNavigator';

const queryClient = new QueryClient();

// ─── Loading splash shown while auth state resolves ──────────────────────────
const SPLASH_COIN = 96;
function SplashScreen() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.96, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <LinearGradient colors={['#080F1E', '#0f1d3a', '#080F1E']} style={styles.splash}>
      <StatusBar barStyle="light-content" />
      <View style={styles.splashGlow} />
      <Animated.View style={[styles.splashCoinOuter, { transform: [{ scale: pulse }] }]}>
        <View style={styles.splashCoinInner}>
          <Text style={styles.splashCoinText}>WW</Text>
        </View>
      </Animated.View>
      <Text style={styles.splashTitle}>WealthWise</Text>
      <Text style={styles.splashTitleSub}>Kids</Text>
      <ActivityIndicator size="small" color="#F5C518" style={{ marginTop: 40 }} />
    </LinearGradient>
  );
}

// ─── Root app shell — decides which navigator to render ──────────────────────
function AppShell() {
  const { user, selectedChild, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    initialize().then((unsub) => { unsubscribe = unsub; });
    return () => { unsubscribe?.(); };
  }, []);

  if (isLoading) return <SplashScreen />;
  if (!user) return <AuthNavigator />;
  if (!selectedChild) return <ParentNavigator />;
  return <StudentNavigator />;
}

// ─── Error boundary — catches render crashes and shows a fallback ─────────────
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorState}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSub}>Please close and reopen the app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <NavigationContainer>
              <AppShell />
            </NavigationContainer>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashGlow: {
    position: 'absolute',
    width: SPLASH_COIN * 2.6,
    height: SPLASH_COIN * 2.6,
    borderRadius: SPLASH_COIN * 1.3,
    backgroundColor: 'rgba(245,197,24,0.07)',
  },
  splashCoinOuter: {
    width: SPLASH_COIN,
    height: SPLASH_COIN,
    borderRadius: SPLASH_COIN / 2,
    backgroundColor: '#9A6A00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 14,
    marginBottom: 22,
  },
  splashCoinInner: {
    width: SPLASH_COIN * 0.84,
    height: SPLASH_COIN * 0.84,
    borderRadius: SPLASH_COIN * 0.42,
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  splashCoinText: { fontSize: SPLASH_COIN * 0.2, fontWeight: '900', color: 'rgba(0,0,0,0.28)', letterSpacing: 1 },
  splashTitle: { fontSize: 36, fontWeight: '900', color: '#F5C518', letterSpacing: 0.3 },
  splashTitleSub: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: -4, letterSpacing: 0.3 },
  errorState: {
    flex: 1,
    backgroundColor: '#1B3A6B',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon:  { fontSize: 52, marginBottom: 16 },
  errorTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  errorSub:   { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
});
