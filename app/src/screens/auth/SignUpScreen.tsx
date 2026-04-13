import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import supabase from '../../lib/supabase';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { hapticTap, hapticError } from '../../utils/haptics';

type Props = { navigation: StackNavigationProp<AuthStackParamList, 'SignUp'> };

export default function SignUpScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [agreed, setAgreed]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  const validate = () => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!email.trim())    return 'Please enter your email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirm) return 'Passwords do not match.';
    if (!agreed) return 'You must agree to the Terms of Service to continue.';
    return null;
  };

  const handleSignUp = async () => {
    const validationError = validate();
    if (validationError) { hapticError(); setError(validationError); return; }

    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    setLoading(false);
    if (signUpError) {
      hapticError();
      setError(signUpError.message);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <LinearGradient colors={['#0D1F3C', '#091528']} style={styles.doneContainer}>
        <SafeAreaView style={styles.doneSafe}>
          <Text style={styles.checkmark}>📧</Text>
          <Text style={styles.doneTitle}>Check your email!</Text>
          <Text style={styles.doneBody}>
            We sent a verification link to {email.trim().toLowerCase()}.{'\n\n'}
            Click the link to activate your account, then come back and sign in.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => { hapticTap(); navigation.navigate('SignIn'); }}>
            <Text style={styles.primaryBtnText}>Go to Sign In</Text>
          </TouchableOpacity>
        </SafeAreaView>
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
        <TouchableOpacity style={styles.backBtn} onPress={() => { hapticTap(); navigation.goBack(); }}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Parents sign up here. You'll add your child after.</Text>

        <Input label="Full Name" value={fullName} onChangeText={setFullName}
          placeholder="Jane Smith" autoCapitalize="words" />
        <Input label="Email Address" value={email} onChangeText={setEmail}
          placeholder="jane@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Password" value={password} onChangeText={setPassword}
          placeholder="At least 8 characters" secureTextEntry />
        <Input label="Confirm Password" value={confirm} onChangeText={setConfirm}
          placeholder="Re-enter password" secureTextEntry />

        <TouchableOpacity style={styles.checkRow} onPress={() => { hapticTap(); setAgreed(!agreed); }}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Text style={styles.checkTick}>✓</Text>}
          </View>
          <Text style={styles.agreeText}>
            I agree to the{' '}
            <Text style={styles.link}>Terms of Service</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.disabled]}
          onPress={() => { hapticTap(); handleSignUp(); }}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.switchRow} onPress={() => { hapticTap(); navigation.navigate('SignIn'); }}>
          <Text style={styles.switchText}>Already have an account? <Text style={styles.link}>Sign In</Text></Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Input({ label, ...props }: any) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="rgba(255,255,255,0.3)" {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  doneContainer: { flex: 1 },
  doneSafe: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  scroll: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 48 },
  backBtn: { marginBottom: 28 },
  backText: { color: 'rgba(255,255,255,0.65)', fontSize: 15 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 28 },
  label: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.55)',
    marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#fff', marginBottom: 16,
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#27AE60', borderColor: '#27AE60' },
  checkTick: { color: '#fff', fontSize: 13, fontWeight: '800' },
  agreeText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },
  link: { color: '#F5C518', fontWeight: '700' },
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
  checkmark: { fontSize: 64, textAlign: 'center', marginBottom: 24 },
  doneTitle: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12 },
  doneBody: { fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
});
