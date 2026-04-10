import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Linking,
} from 'react-native';
import supabase from '../../lib/supabase';
import useAuthStore, { getChildAge } from '../../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ConnectedBank {
  id: string;
  institution_name: string;
  last_synced: string | null;
}

export default function ConnectBankScreen() {
  const { selectedChild } = useAuthStore();
  const [loading, setLoading]   = useState(true);
  const [connected, setConnected] = useState<ConnectedBank | null>(null);
  const [plaidReady, setPlaidReady] = useState(false);
  const [linkToken, setLinkToken]   = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const childAge = selectedChild?.birthdate ? getChildAge(selectedChild.birthdate) : 99;
  const isUnder13 = childAge < 13;

  useEffect(() => {
    if (selectedChild) checkConnection();
  }, [selectedChild]);

  const checkConnection = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('plaid_connections')
      .select('id, institution_name, last_synced')
      .eq('child_id', selectedChild!.id)
      .eq('is_active', true)
      .maybeSingle();

    setConnected(data ?? null);
    setLoading(false);

    // Pre-fetch Plaid link token if not under 13 and not connected
    if (!data && !isUnder13) {
      fetchLinkToken();
    }
  };

  const fetchLinkToken = async () => {
    try {
      const res = await fetch(`${API_URL}/plaid/create-link-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: selectedChild!.id }),
      });
      const { link_token } = await res.json();
      if (link_token) {
        setLinkToken(link_token);
        setPlaidReady(true);
      }
    } catch {
      // non-fatal
    }
  };

  const handleOpenPlaid = async () => {
    // In production use react-native-plaid-link-sdk
    // For now, open Plaid sandbox via deep-link / web for demo
    if (!linkToken) {
      Alert.alert('Not ready', 'Plaid link is not ready yet. Please try again.');
      return;
    }
    setLinkLoading(true);
    // Plaid Sandbox redirect — replace with PlaidLink component in production
    const plaidUrl = `https://cdn.plaid.com/link/v2/stable/link.html?token=${linkToken}`;
    await Linking.openURL(plaidUrl);
    setLinkLoading(false);
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Bank',
      'This will remove your bank connection and stop transaction sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect', style: 'destructive',
          onPress: async () => {
            if (!connected) return;
            setDisconnecting(true);
            await fetch(`${API_URL}/plaid/disconnect/${selectedChild!.id}`, { method: 'DELETE' });
            setConnected(null);
            setDisconnecting(false);
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#1B3A6B" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  // Under 13 — parent must connect
  if (isUnder13) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>Connect Bank</Text>
          <View style={styles.parentNeededCard}>
            <Text style={styles.parentIcon}>👨‍👩‍👧</Text>
            <Text style={styles.parentTitle}>Parent Approval Required</Text>
            <Text style={styles.parentSub}>
              Because {selectedChild?.name} is under 13, a parent needs to connect the bank account.
              Ask a parent to open the app and approve the bank connection in their Parent Dashboard.
            </Text>
            <View style={styles.stepsCard}>
              {[
                '1. Parent opens WealthWise',
                '2. Goes to Parent Dashboard',
                '3. Taps \'Bank Approvals\'',
                '4. Approves the connection',
              ].map((s) => (
                <Text key={s} style={styles.step}>{s}</Text>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Already connected
  if (connected) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>Bank Connected</Text>
          <View style={styles.connectedCard}>
            <Text style={styles.bankIcon}>🏦</Text>
            <Text style={styles.bankName}>{connected.institution_name || 'Your Bank'}</Text>
            {connected.last_synced && (
              <Text style={styles.lastSynced}>
                Last synced {new Date(connected.last_synced).toLocaleDateString()}
              </Text>
            )}
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedBadgeText}>✓ Connected</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect} disabled={disconnecting}>
            {disconnecting
              ? <ActivityIndicator color="#C62828" size="small" />
              : <Text style={styles.disconnectText}>Disconnect Bank</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Not connected — show connect flow
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Connect a Bank</Text>
        <Text style={styles.subtitle}>
          Securely link your bank to automatically track spending and reach your saving goals.
        </Text>

        {/* Security callout */}
        <View style={styles.securityCard}>
          <Text style={styles.securityTitle}>🔒 Bank-level security</Text>
          <Text style={styles.securityText}>
            WealthWise uses Plaid — the same technology used by major banks.
            We never see or store your login credentials.
          </Text>
        </View>

        {/* Benefits */}
        {[
          ['📊', 'Auto-categorized spending'],
          ['🎯', 'Goal progress tracking'],
          ['📱', 'Real-time balance alerts'],
        ].map(([emoji, label]) => (
          <View key={label} style={styles.benefitRow}>
            <Text style={styles.benefitEmoji}>{emoji}</Text>
            <Text style={styles.benefitText}>{label}</Text>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.connectBtn, !plaidReady && styles.connectBtnDisabled]}
          onPress={handleOpenPlaid}
          disabled={linkLoading || !plaidReady}
        >
          {linkLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.connectBtnText}>
                {plaidReady ? 'Connect Bank with Plaid' : 'Loading...'}
              </Text>
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Plaid's privacy policy governs the transmission of your financial data.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  content:   { padding: 20, paddingBottom: 60 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1B3A6B', marginBottom: 8 },
  subtitle:  { fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 20 },
  parentNeededCard: { backgroundColor: '#FFF9E6', borderRadius: 16, padding: 24, alignItems: 'center' },
  parentIcon:  { fontSize: 52, marginBottom: 12 },
  parentTitle: { fontSize: 20, fontWeight: '800', color: '#1B3A6B', marginBottom: 10, textAlign: 'center' },
  parentSub:   { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  stepsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '100%' },
  step: { fontSize: 14, color: '#333', marginBottom: 10, lineHeight: 20 },
  connectedCard: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 20 },
  bankIcon:  { fontSize: 52, marginBottom: 12 },
  bankName:  { fontSize: 20, fontWeight: '800', color: '#1B3A6B', marginBottom: 6 },
  lastSynced: { fontSize: 13, color: '#aaa', marginBottom: 12 },
  connectedBadge: { backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  connectedBadgeText: { fontSize: 14, fontWeight: '700', color: '#27AE60' },
  disconnectBtn: { borderWidth: 2, borderColor: '#C62828', borderRadius: 50, padding: 16, alignItems: 'center' },
  disconnectText: { fontSize: 15, fontWeight: '700', color: '#C62828' },
  securityCard: { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 16, marginBottom: 20 },
  securityTitle: { fontSize: 15, fontWeight: '700', color: '#1B3A6B', marginBottom: 6 },
  securityText:  { fontSize: 13, color: '#555', lineHeight: 19 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10 },
  benefitEmoji: { fontSize: 22, marginRight: 14 },
  benefitText:  { fontSize: 15, fontWeight: '600', color: '#333' },
  connectBtn: {
    backgroundColor: '#1B3A6B', borderRadius: 50, padding: 18,
    alignItems: 'center', marginTop: 24, marginBottom: 12,
  },
  connectBtnDisabled: { opacity: 0.6 },
  connectBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  disclaimer: { fontSize: 11, color: '#bbb', textAlign: 'center', lineHeight: 16 },
});
