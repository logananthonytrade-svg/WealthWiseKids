import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { syncTransactions } from '../../utils/plaidUtils';

interface CategoryTotal {
  category: string;
  total: number;
  emoji: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  food:          '🍔',
  entertainment: '🎬',
  shopping:      '🛍',
  transport:     '🚗',
  education:     '📚',
  other:         '📦',
};

export default function SpendingReportsScreen() {
  const navigation   = useNavigation<any>();
  const { selectedChild } = useAuthStore();
  const [hasBank, setHasBank]   = useState<boolean | null>(null);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);
  const [lastMonthTotal, setLastMonthTotal]       = useState(0);

  useEffect(() => {
    if (selectedChild) checkBankAndLoad();
  }, [selectedChild]);

  const checkBankAndLoad = async () => {
    setLoading(true);
    const { data: conn } = await supabase
      .from('plaid_connections')
      .select('id, is_active, last_synced')
      .eq('child_id', selectedChild!.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!conn) {
      setHasBank(false);
      setLoading(false);
      return;
    }

    setHasBank(true);
    setLastSynced(conn.last_synced);
    await loadSpendingData();
    setLoading(false);
  };

  const loadSpendingData = async () => {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const [{ data: current }, { data: last }, { data: recent }] = await Promise.all([
      supabase.from('budget_entries').select('amount,category').eq('child_id', selectedChild!.id).gte('date', start),
      supabase.from('budget_entries').select('amount').eq('child_id', selectedChild!.id).gte('date', lastStart).lte('date', lastEnd),
      supabase.from('budget_entries').select('id,description,amount,category,date').eq('child_id', selectedChild!.id).order('date', { ascending: false }).limit(30),
    ]);

    const curTotal = (current ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
    const lstTotal = (last ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
    setCurrentMonthTotal(curTotal);
    setLastMonthTotal(lstTotal);

    // Group by category
    const catMap: Record<string, number> = {};
    (current ?? []).forEach((r: any) => {
      catMap[r.category] = (catMap[r.category] ?? 0) + Number(r.amount);
    });
    setCategories(
      Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, total]) => ({ category: cat, total, emoji: CATEGORY_EMOJIS[cat] ?? '📦' })),
    );

    setTransactions(
      (recent ?? []).map((r: any) => ({
        id: r.id, description: r.description, amount: r.amount, category: r.category, date: r.date,
      })),
    );
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncTransactions(selectedChild!.id);
    await checkBankAndLoad();
    setSyncing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#1B3A6B" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!hasBank) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noBankState}>
          <Text style={styles.noBankIcon}>🏦</Text>
          <Text style={styles.noBankTitle}>No Bank Connected</Text>
          <Text style={styles.noBankSub}>
            Connect a bank account to automatically track your spending and hit your goals.
          </Text>
          <TouchableOpacity style={styles.connectBtn} onPress={() => navigation.navigate('ConnectBank')}>
            <Text style={styles.connectBtnText}>Connect a Bank</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const delta = currentMonthTotal - lastMonthTotal;
  const deltaSign = delta >= 0 ? '+' : '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Spending</Text>
          <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={syncing}>
            {syncing
              ? <ActivityIndicator color="#1B3A6B" size="small" />
              : <Text style={styles.syncText}>↻ Sync</Text>
            }
          </TouchableOpacity>
        </View>

        {lastSynced && (
          <Text style={styles.lastSynced}>Last synced {new Date(lastSynced).toLocaleDateString()}</Text>
        )}

        {/* This month vs last */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryAmount}>${currentMonthTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Last Month</Text>
            <Text style={styles.summaryAmount}>${lastMonthTotal.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, delta > 0 ? styles.overCard : styles.underCard]}>
            <Text style={styles.summaryLabel}>vs Last Month</Text>
            <Text style={[styles.summaryAmount, delta > 0 ? styles.overText : styles.underText]}>
              {deltaSign}${Math.abs(delta).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Category breakdown */}
        {categories.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>By Category</Text>
            {categories.map((c) => {
              const pct = currentMonthTotal > 0 ? (c.total / currentMonthTotal) * 100 : 0;
              return (
                <View key={c.category} style={styles.catRow}>
                  <Text style={styles.catEmoji}>{c.emoji}</Text>
                  <View style={styles.catBar}>
                    <View style={styles.catLabelRow}>
                      <Text style={styles.catLabel}>{c.category.charAt(0).toUpperCase() + c.category.slice(1)}</Text>
                      <Text style={styles.catAmount}>${c.total.toFixed(2)}</Text>
                    </View>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%` }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Transactions */}
        {transactions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.map((t) => (
              <View key={t.id} style={styles.txRow}>
                <Text style={styles.txEmoji}>{CATEGORY_EMOJIS[t.category] ?? '📦'}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.txDesc} numberOfLines={1}>{t.description}</Text>
                  <Text style={styles.txDate}>{new Date(t.date + 'T00:00:00').toLocaleDateString()}</Text>
                </View>
                <Text style={styles.txAmount}>-${Number(t.amount).toFixed(2)}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  content:   { padding: 20, paddingBottom: 60 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1B3A6B' },
  syncBtn:   { padding: 8 },
  syncText:  { fontSize: 15, color: '#1B3A6B', fontWeight: '700' },
  lastSynced: { fontSize: 12, color: '#aaa', marginBottom: 18 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center' },
  overCard:  { backgroundColor: '#FFF3F3' },
  underCard: { backgroundColor: '#F0FFF4' },
  summaryLabel: { fontSize: 11, color: '#888', marginBottom: 4, textAlign: 'center' },
  summaryAmount: { fontSize: 15, fontWeight: '800', color: '#1B3A6B', textAlign: 'center' },
  overText:  { color: '#C62828' },
  underText: { color: '#27AE60' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  catEmoji: { fontSize: 22, marginRight: 12 },
  catBar: { flex: 1 },
  catLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
  catAmount: { fontSize: 13, fontWeight: '700', color: '#1B3A6B' },
  barBg: { height: 8, backgroundColor: '#E8EAEF', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: '#27AE60', borderRadius: 4 },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  txEmoji: { fontSize: 22 },
  txDesc: { fontSize: 14, fontWeight: '600', color: '#333' },
  txDate: { fontSize: 12, color: '#aaa', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700', color: '#C62828' },
  noBankState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  noBankIcon:  { fontSize: 64, marginBottom: 16 },
  noBankTitle: { fontSize: 22, fontWeight: '800', color: '#1B3A6B', marginBottom: 8 },
  noBankSub:   { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  connectBtn:  { backgroundColor: '#1B3A6B', borderRadius: 50, paddingHorizontal: 36, paddingVertical: 16 },
  connectBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
