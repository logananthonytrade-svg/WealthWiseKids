import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import supabase from '../../lib/supabase';

interface PendingRequest {
  id: string;
  child_id: string;
  child_name: string;
  child_avatar: number;
  requested_at: string;
}

const AVATARS = ['🐶','🐱','🦁','🐸','🦊','🐧','🦋','🌟','🚀','🎨'];

export default function BankApprovalScreen() {
  const [requests, setRequests]   = useState<PendingRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    // Find plaid_connections with is_active = false (pending approval)
    const { data, error } = await supabase
      .from('plaid_connections')
      .select('id, child_id, created_at, child_profiles(name, avatar_index)')
      .eq('is_active', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data.map((row: any) => ({
        id: row.id,
        child_id: row.child_id,
        child_name: row.child_profiles?.name ?? 'Child',
        child_avatar: row.child_profiles?.avatar_index ?? 0,
        requested_at: row.created_at,
      })));
    }
    setLoading(false);
  };

  const handleApprove = async (req: PendingRequest) => {
    setProcessing(req.id);
    const { error } = await supabase
      .from('plaid_connections')
      .update({ is_active: true })
      .eq('id', req.id);

    if (error) {
      Alert.alert('Error', 'Could not approve request. Please try again.');
    } else {
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    }
    setProcessing(null);
  };

  const handleDeny = async (req: PendingRequest) => {
    Alert.alert(
      'Deny Request',
      `Are you sure you want to deny ${req.child_name}'s bank connection request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny', style: 'destructive',
          onPress: async () => {
            setProcessing(req.id);
            await supabase.from('plaid_connections').delete().eq('id', req.id);
            setRequests((prev) => prev.filter((r) => r.id !== req.id));
            setProcessing(null);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Bank Approvals</Text>
        <Text style={styles.subtitle}>
          Your child requested to connect a bank account. Review and approve or deny below.
        </Text>

        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        ) : (
          requests.map((req) => (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.avatar}>{AVATARS[req.child_avatar] ?? '🌟'}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.childName}>{req.child_name}</Text>
                  <Text style={styles.timestamp}>
                    Requested {new Date(req.requested_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <Text style={styles.infoText}>
                Approving allows {req.child_name} to view their spending and track budget goals in the app.
                Their full bank account data is never stored — only transaction summaries.
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.denyButton}
                  onPress={() => handleDeny(req)}
                  disabled={processing === req.id}
                >
                  <Text style={styles.denyText}>Deny</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApprove(req)}
                  disabled={processing === req.id}
                >
                  {processing === req.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.approveText}>Approve ✓</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  content:   { padding: 20, paddingBottom: 60 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1B3A6B', marginBottom: 6 },
  subtitle:  { fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 20 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { fontSize: 36 },
  childName: { fontSize: 17, fontWeight: '800', color: '#1B3A6B' },
  timestamp: { fontSize: 12, color: '#aaa', marginTop: 2 },
  infoText: { fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 16, backgroundColor: '#F0F4FF', padding: 12, borderRadius: 8 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  denyButton: {
    flex: 1, padding: 14, borderRadius: 50, borderWidth: 2,
    borderColor: '#C62828', alignItems: 'center',
  },
  denyText: { fontSize: 15, fontWeight: '700', color: '#C62828' },
  approveButton: {
    flex: 2, padding: 14, borderRadius: 50,
    backgroundColor: '#27AE60', alignItems: 'center',
  },
  approveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
