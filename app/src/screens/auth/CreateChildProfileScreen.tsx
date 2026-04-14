import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { differenceInYears, parseISO } from 'date-fns';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { hapticTap } from '../../utils/haptics';

const AVATARS = ['??', '??', '??', '??', '??', '??', '??', '??', '??', '??'];

export default function CreateChildProfileScreen() {
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>();
  const { user, loadChildren, consentGiven, setConsentGiven } = useAuthStore();

  const [name, setName]           = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [avatarChoice, setAvatar] = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const getAge = () => {
    try { return differenceInYears(new Date(), parseISO(birthdate)); }
    catch { return null; }
  };

  const handleSave = async () => {
    const age = getAge();
    setError(null);

    if (!name.trim()) { setError("Please enter the child's name."); return; }
    if (!birthdate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setError('Enter birthdate in YYYY-MM-DD format (e.g. 2015-04-22).');
      return;
    }
    if (age === null || age < 5 || age > 18) {
      setError('Please enter a valid birthdate for a child ages 5�18.');
      return;
    }
    if (age < 13 && !consentGiven) {
      navigation.navigate('ParentalConsent', { childName: name.trim(), childBirthdate: birthdate });
      return;
    }

    setLoading(true);

    const { data: child, error: childError } = await supabase
      .from('child_profiles')
      .insert({ parent_id: user!.id, name: name.trim(), birthdate, avatar_choice: avatarChoice })
      .select()
      .single();

    if (childError || !child) {
      setLoading(false);
      setError(childError?.message ?? 'Failed to create child profile.');
      return;
    }

    await Promise.all([
      supabase.from('wealth_coins').insert({ child_id: child.id, balance: 0 }),
      supabase.from('streaks').insert({ child_id: child.id }),
    ]);

    if (age < 13 && consentGiven) {
      await supabase.from('parental_consents').insert({
        parent_id: user!.id,
        child_id: child.id,
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
      });
      setConsentGiven(false);
    }

    const { data: school1Lessons } = await supabase
      .from('lessons').select('id, school_id').eq('school_id', 1);

    if (school1Lessons && school1Lessons.length > 0) {
      await supabase.from('student_progress').insert(
        school1Lessons.map((l: { id: string; school_id: number }) => ({
          child_id: child.id, school_id: l.school_id, lesson_id: l.id, completed: false,
        }))
      );
    }

    await loadChildren(user!.id);
    setLoading(false);
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  return (
    <LinearGradient colors={['#0D1F3C', '#091528']} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => { hapticTap(); navigation.goBack(); }}>
            <Text style={styles.backText}>? Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Add a Child</Text>
          <Text style={styles.subtitle}>
            Create a learning profile for your child. You can add more children later.
          </Text>

          <Text style={styles.label}>Choose an Avatar</Text>
          <View style={styles.avatarGrid}>
            {AVATARS.map((emoji, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { hapticTap(); setAvatar(i + 1); }}
                style={[styles.avatarBtn, avatarChoice === i + 1 && styles.avatarSelected]}
              >
                <Text style={styles.avatarEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Child's First Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Emma"
            autoCapitalize="words"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={birthdate}
            onChangeText={setBirthdate}
            placeholder="e.g. 2015-04-22"
            keyboardType="numbers-and-punctuation"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />
          {birthdate.match(/^\d{4}-\d{2}-\d{2}$/) && getAge() !== null && (
            <Text style={styles.ageHint}>Age: {getAge()} years old</Text>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.disabled]}
            onPress={() => { hapticTap(); handleSave(); }}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>{loading ? 'Creating profile�' : 'Create Profile'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  backBtn: { marginBottom: 24 },
  backText: { color: 'rgba(255,255,255,0.65)', fontSize: 15 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 28, lineHeight: 20 },
  label: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.55)',
    marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase',
  },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  avatarBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  avatarSelected: { borderColor: '#F5C518', backgroundColor: 'rgba(245,197,24,0.12)' },
  avatarEmoji: { fontSize: 28 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#fff', marginBottom: 16,
  },
  ageHint: { color: '#4ADE80', fontSize: 13, fontWeight: '600', marginTop: -10, marginBottom: 16 },
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
});
