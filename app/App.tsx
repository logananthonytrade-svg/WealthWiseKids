import 'react-native-gesture-handler';
import React, { useEffect, Component } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import useAuthStore from './src/store/authStore';
import AuthNavigator from './src/navigation/AuthNavigator';
import ParentNavigator from './src/navigation/ParentNavigator';
import StudentNavigator from './src/navigation/StudentNavigator';

const queryClient = new QueryClient();

// ─── Loading splash shown while auth state resolves ──────────────────────────
function SplashScreen() {
  return (
    <View style={styles.splash}>
      <Text style={styles.splashLogo}>💰</Text>
      <Text style={styles.splashTitle}>WealthWise<Text style={styles.splashTitleAccent}>Kids</Text></Text>
      <ActivityIndicator size="large" color="#F0A500" style={{ marginTop: 32 }} />
    </View>
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
  splash: {
    flex: 1,
    backgroundColor: '#1B3A6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    fontSize: 72,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  splashTitleAccent: {
    color: '#F0A500',
  },
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
