import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import supabase from '../../lib/supabase';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = { navigation: StackNavigationProp<AuthStackParamList, 'SignIn'> };

export default function SignInScreen({ navigation }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);
    if (signInError) {
      // Translate Supabase error messages into plain English
      if (signInError.message.includes('Invalid login')) {
        setError('Incorrect email or password. Please try again.');
      } else if (signInError.message.includes('Email not confirmed')) {
        setError('Please verify your email address first. Check your inbox for a link from us.');
      } else {
        setError(signInError.message);
      }
    }
    // On success, authStore listener handles navigation automatically
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address above, then tap Forgot Password.');
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: 'wealthwisekids://reset-password' }
    );
    if (resetError) {
      setError(resetError.message);
    } else {
      setResetSent(true);
    }
  };

  return (
    <LinearGradient colors={['#0D1F3C', '#091528']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your parent account.</Text>

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="jane@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          placeholderTextColor="rgba(255,255,255,0.3)"
        />

        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotRow}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {resetSent && (
          <Text style={styles.successText}>✅ Password reset email sent! Check your inbox.</Text>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.disabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.switchRow} onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.switchText}>
            Don't have an account? <Text style={styles.link}>Create one</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scroll: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 48 },
  backBtn: { marginBottom: 28 },
  backText: { color: 'rgba(255,255,255,0.65)', fontSize: 15 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 },
  label: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.55)',
    marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#fff', marginBottom: 20,
  },
  forgotRow: { alignItems: 'flex-end', marginBottom: 24, marginTop: -12 },
  forgotText: { color: '#F5C518', fontSize: 13, fontWeight: '600' },
  successText: {
    backgroundColor: 'rgba(39,174,96,0.12)', color: '#4ADE80', padding: 12,
    borderRadius: 10, fontSize: 13, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(39,174,96,0.25)',
  },
  errorText: {
    backgroundColor: 'rgba(198,40,40,0.12)', color: '#FC8181', padding: 12,
    borderRadius: 10, fontSize: 13, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(198,40,40,0.25)',
  },
  primaryBtn: {
    backgroundColor: '#F5C518', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  primaryBtnText: { color: '#1B3A6B', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  switchRow: { alignItems: 'center', marginTop: 4 },
  switchText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  link: { color: '#F5C518', fontWeight: '700' },
});
