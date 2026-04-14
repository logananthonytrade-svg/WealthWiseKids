import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Switch, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import useAuthStore from '../../store/authStore';
import { hapticTap } from '../../utils/haptics';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ParentSettingsScreen() {
  const { user, signOut, children } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/subscriptions/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const { url } = await res.json();
      if (url) await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.emailLabel}>Signed in as</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <TouchableOpacity style={styles.actionRow} onPress={() => { hapticTap(); handleManageSubscription(); }} disabled={loading}>
          <Text style={styles.actionText}>💳 Manage Subscription</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionRow, styles.signOutRow]} onPress={() => { hapticTap(); signOut(); }}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Children controls */}
        {children.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Child Controls</Text>
            {children.map((child) => (
              <ChildControls key={child.id} child={child} />
            ))}
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChildControls({ child }: { child: any }) {
  const [bankAllowed, setBankAllowed]     = useState(false);
  const [investAllowed, setInvestAllowed] = useState(false);
  const [alertThreshold, setThreshold]   = useState('');

  return (
    <View style={styles.childCard}>
      <Text style={styles.childName}>{child.name}</Text>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Allow bank connection</Text>
        <Switch
          value={bankAllowed}
          onValueChange={setBankAllowed}
          trackColor={{ true: '#27AE60' }}
          thumbColor="#fff"
        />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Allow investing features</Text>
        <Switch
          value={investAllowed}
          onValueChange={setInvestAllowed}
          trackColor={{ true: '#27AE60' }}
          thumbColor="#fff"
        />
      </View>
      <View style={styles.thresholdRow}>
        <Text style={styles.toggleLabel}>Spending alert over $</Text>
        <TextInput
          style={styles.thresholdInput}
          value={alertThreshold}
          onChangeText={setThreshold}
          keyboardType="numeric"
          placeholder="e.g. 50"
          placeholderTextColor="#bbb"
        />
        <Text style={styles.perMonth}>/month</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  content:   { padding: 20, paddingBottom: 60 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1B3A6B', marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
  },
  emailLabel: { fontSize: 12, color: '#aaa', marginBottom: 4 },
  email: { fontSize: 15, fontWeight: '600', color: '#1B3A6B' },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8,
  },
  actionText: { fontSize: 15, color: '#1B3A6B', fontWeight: '600' },
  chevron: { fontSize: 20, color: '#aaa' },
  signOutRow: { marginTop: 8 },
  signOutText: { fontSize: 15, color: '#C62828', fontWeight: '700' },
  childCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
  },
  childName: { fontSize: 16, fontWeight: '800', color: '#1B3A6B', marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  toggleLabel: { fontSize: 14, color: '#444', flex: 1 },
  thresholdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thresholdInput: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 14, color: '#222', width: 60, textAlign: 'center',
  },
  perMonth: { fontSize: 13, color: '#888' },
});
