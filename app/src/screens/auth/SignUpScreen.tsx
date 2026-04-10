import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, StatusBar, SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import supabase from '../../lib/supabase';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

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
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.checkmark}>📬</Text>
        <Text style={styles.doneTitle}>Check your email!</Text>
        <Text style={styles.doneBody}>
          We sent a verification link to {email.trim().toLowerCase()}.{'\n\n'}
          Click the link to activate your account, then come back and sign in.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('SignIn')}>
          <Text style={styles.primaryBtnText}>Go to Sign In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Parent Account</Text>
        <Text style={styles.subtitle}>Parents sign up here. You will add your children after.</Text>

        <Input label="Full Name" value={fullName} onChangeText={setFullName}
          placeholder="Jane Smith" autoCapitalize="words" />
        <Input label="Email Address" value={email} onChangeText={setEmail}
          placeholder="jane@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Password" value={password} onChangeText={setPassword}
          placeholder="At least 8 characters" secureTextEntry />
        <Input label="Confirm Password" value={confirm} onChangeText={setConfirm}
          placeholder="Re-enter password" secureTextEntry />

        <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed(!agreed)}>
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
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.switchRow} onPress={() => navigation.navigate('SignIn')}>
          <Text style={styles.switchText}>Already have an account? <Text style={styles.link}>Sign In</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({ label, ...props }: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#aaa" {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  backBtn: { marginBottom: 24 },
  backText: { color: '#1B3A6B', fontSize: 15 },
  title: { fontSize: 26, fontWeight: '800', color: '#1B3A6B', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#222',
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#ddd',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#27AE60', borderColor: '#27AE60' },
  checkTick: { color: '#fff', fontSize: 13, fontWeight: '800' },
  agreeText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 20 },
  link: { color: '#1B3A6B', fontWeight: '700' },
  errorText: {
    backgroundColor: '#FFF0F0', color: '#C62828', padding: 12,
    borderRadius: 8, fontSize: 13, marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#1B3A6B', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  switchRow: { alignItems: 'center' },
  switchText: { fontSize: 14, color: '#666' },
  checkmark: { fontSize: 64, textAlign: 'center', marginTop: 80, marginBottom: 24 },
  doneTitle: { fontSize: 26, fontWeight: '800', color: '#1B3A6B', textAlign: 'center', marginBottom: 12 },
  doneBody: { fontSize: 15, color: '#444', textAlign: 'center', lineHeight: 22, marginBottom: 40, marginHorizontal: 24 },
});
