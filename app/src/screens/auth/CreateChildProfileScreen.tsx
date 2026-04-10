import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { differenceInYears, parseISO } from 'date-fns';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

const AVATARS = ['🦁', '🐯', '🦊', '🐼', '🐨', '🦋', '🐬', '🦅', '🦉', '🐉'];

export default function CreateChildProfileScreen() {
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>();
  const { user, loadChildren, consentGiven, setConsentGiven } = useAuthStore();

  const [name, setName]             = useState('');
  const [birthdate, setBirthdate]   = useState('');  // YYYY-MM-DD
  const [avatarChoice, setAvatar]   = useState(1);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Calculate age from entered birthdate string
  const getAge = () => {
    try {
      return differenceInYears(new Date(), parseISO(birthdate));
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    const age = getAge();
    setError(null);

    if (!name.trim()) { setError('Please enter the child\'s name.'); return; }
    if (!birthdate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setError('Enter birthdate in YYYY-MM-DD format (e.g. 2015-04-22).');
      return;
    }
    if (age === null || age < 5 || age > 18) {
      setError('Please enter a valid birthdate for a child ages 5–18.');
      return;
    }
    if (age < 13 && !consentGiven) {
      navigation.navigate('ParentalConsent', {
        childName: name.trim(),
        childBirthdate: birthdate,
      });
      return;
    }

    setLoading(true);

    // 1. Create child_profiles row
    const { data: child, error: childError } = await supabase
      .from('child_profiles')
      .insert({
        parent_id: user!.id,
        name: name.trim(),
        birthdate,
        avatar_choice: avatarChoice,
      })
      .select()
      .single();

    if (childError || !child) {
      setLoading(false);
      setError(childError?.message ?? 'Failed to create child profile.');
      return;
    }

    // 2. Create initial wealth_coins and streaks rows
    await Promise.all([
      supabase.from('wealth_coins').insert({ child_id: child.id, balance: 0 }),
      supabase.from('streaks').insert({ child_id: child.id }),
    ]);

    // 3. Record parental consent if child is under 13
    if (age < 13 && consentGiven) {
      await supabase.from('parental_consents').insert({
        parent_id: user!.id,
        child_id: child.id,
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
      });
      setConsentGiven(false); // reset for next child creation
    }

    // 4. Pre-create student_progress rows for all School 1 lessons
    const { data: school1Lessons } = await supabase
      .from('lessons')
      .select('id, school_id')
      .eq('school_id', 1);

    if (school1Lessons && school1Lessons.length > 0) {
      await supabase.from('student_progress').insert(
        school1Lessons.map((l: { id: string; school_id: number }) => ({
          child_id: child.id,
          school_id: l.school_id,
          lesson_id: l.id,
          completed: false,
        }))
      );
    }

    // 5. Re-load children list in store and go to parent dashboard
    await loadChildren(user!.id);
    setLoading(false);

    // If first child, navigate back to parent home
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Add a Child</Text>
        <Text style={styles.subtitle}>
          Create a learning profile for your child. You can add more children later.
        </Text>

        {/* Avatar Picker */}
        <Text style={styles.label}>Choose an Avatar</Text>
        <View style={styles.avatarGrid}>
          {AVATARS.map((emoji, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setAvatar(i + 1)}
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
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={birthdate}
          onChangeText={setBirthdate}
          placeholder="e.g. 2015-04-22"
          keyboardType="numbers-and-punctuation"
          placeholderTextColor="#aaa"
        />
        {birthdate.match(/^\d{4}-\d{2}-\d{2}$/) && getAge() !== null && (
          <Text style={styles.ageHint}>Age: {getAge()} years old</Text>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.disabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>{loading ? 'Creating profile…' : 'Create Profile'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  backBtn: { marginBottom: 24 },
  backText: { color: '#1B3A6B', fontSize: 15 },
  title: { fontSize: 26, fontWeight: '800', color: '#1B3A6B', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 28, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 10 },
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24,
  },
  avatarBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  avatarSelected: { borderColor: '#1B3A6B', backgroundColor: '#E8F0FB' },
  avatarEmoji: { fontSize: 28 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#222', marginBottom: 16,
  },
  ageHint: { color: '#27AE60', fontSize: 13, fontWeight: '600', marginTop: -10, marginBottom: 16 },
  errorText: {
    backgroundColor: '#FFF0F0', color: '#C62828', padding: 12,
    borderRadius: 8, fontSize: 13, marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#1B3A6B', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
