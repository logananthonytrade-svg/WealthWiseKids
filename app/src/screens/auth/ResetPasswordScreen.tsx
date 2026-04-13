import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import supabase from '../../lib/supabase';

interface Props {
  onDone: () => void;
}

export default function ResetPasswordScreen({ onDone }: Props) {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [done, setDone]           = useState(false);

  const handleReset = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <LinearGradient colors={['#0D1F3C', '#091528']} style={styles.gradient}>
        <StatusBar barStyle="light-content" />
        <View style={styles.doneCentre}>
          <Text style={styles.doneIcon}>✅</Text>
          <Text style={styles.doneTitle}>Password Updated!</Text>
          <Text style={styles.doneBody}>
            Your password has been changed successfully.{'\n'}Sign in with your new password.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onDone}>
            <Text style={styles.primaryBtnText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0D1F3C', '#091528']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.iconRow}>
            <Text style={styles.lockIcon}>🔑</Text>
          </View>

          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>Choose a strong password for your account.</Text>

          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter new password"
            secureTextEntry
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          {/* Password strength hints */}
          <View style={styles.hints}>
            <Hint met={password.length >= 8} text="At least 8 characters" />
            <Hint met={/[A-Z]/.test(password)} text="One uppercase letter" />
            <Hint met={/[0-9]/.test(password)} text="One number" />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.disabled]}
            onPress={handleReset}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>{loading ? 'Updating…' : 'Update Password'}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Hint({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.hintRow}>
      <Text style={[styles.hintDot, met && styles.hintDotMet]}>{met ? '✓' : '·'}</Text>
      <Text style={[styles.hintText, met && styles.hintTextMet]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scroll: { paddingHorizontal: 28, paddingTop: 80, paddingBottom: 48 },
  iconRow: { alignItems: 'center', marginBottom: 20 },
  lockIcon: { fontSize: 52 },
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
  hints: { marginBottom: 20, gap: 6 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hintDot: { fontSize: 16, color: 'rgba(255,255,255,0.3)', width: 16 },
  hintDotMet: { color: '#4ADE80' },
  hintText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  hintTextMet: { color: '#4ADE80' },
  errorText: {
    backgroundColor: 'rgba(198,40,40,0.12)', color: '#FC8181', padding: 12,
    borderRadius: 10, fontSize: 13, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(198,40,40,0.25)',
  },
  primaryBtn: {
    backgroundColor: '#F5C518', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center',
  },
  primaryBtnText: { color: '#1B3A6B', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  doneCentre: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  doneIcon: { fontSize: 64, marginBottom: 20 },
  doneTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 12 },
  doneBody: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
});
