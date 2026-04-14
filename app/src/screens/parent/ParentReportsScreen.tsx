import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import useAuthStore, { ChildProfile } from '../../store/authStore';
import supabase from '../../lib/supabase';
import LessonProgressBar from '../../components/lessons/LessonProgressBar';
import { hapticTap } from '../../utils/haptics';

type Tab = 'learning' | 'spending';

const SCREEN_W = Dimensions.get('window').width;

export default function ParentReportsScreen() {
  const children = useAuthStore((s: import('../../store/authStore').AuthState) => s.children);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(
    children.length > 0 ? children[0] : null
  );
  const [tab, setTab]         = useState<Tab>('learning');
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState<any>(null);

  useEffect(() => {
    if (selectedChild) loadData(selectedChild.id);
  }, [selectedChild, tab]);

  const loadData = async (childId: string) => {
    setLoading(true);
    if (tab === 'learning') {
      const [progressRes, attemptsRes, badgesRes, streakRes] = await Promise.all([
        supabase.from('student_progress').select('school_id, completed').eq('child_id', childId),
        supabase.from('quiz_attempts').select('passed, attempted_at').eq('child_id', childId),
        supabase.from('student_badges')
          .select('earned_at, badge:badges(name, icon_name)')
          .eq('child_id', childId)
          .order('earned_at', { ascending: false })
          .limit(5),
        supabase.from('streaks').select('*').eq('child_id', childId).maybeSingle(),
      ]);

      setData({
        lessons: progressRes.data ?? [],
        attempts: attemptsRes.data ?? [],
        recentBadges: badgesRes.data ?? [],
        streak: streakRes.data,
      });
    } else {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const [entriesRes, connRes] = await Promise.all([
        supabase.from('budget_entries')
          .select('amount, category, entry_date, description')
          .eq('child_id', childId)
          .eq('entry_type', 'expense')
          .gte('entry_date', thirtyDaysAgo)
          .order('entry_date', { ascending: false }),
        supabase.from('plaid_connections')
          .select('institution_name, last_synced')
          .eq('child_id', childId)
          .eq('is_active', true)
          .maybeSingle(),
      ]);

      // Aggregate by category
      const byCat: Record<string, number> = {};
      for (const e of entriesRes.data ?? []) {
        byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount);
      }

      setData({
        entries: entriesRes.data ?? [],
        byCat,
        bankConn: connRes.data,
      });
    }
    setLoading(false);
  };

  if (children.length === 0) {
    return (
      <SafeAreaView style={styles.empty}>
        <Text style={styles.emptyText}>Add a child to see reports.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Child selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childSelector}>
        {children.map((c: ChildProfile) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.childChip, selectedChild?.id === c.id && styles.chipActive]}
            onPress={() => { hapticTap(); setSelectedChild(c); }}
          >
            <Text style={[styles.chipText, selectedChild?.id === c.id && styles.chipTextActive]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'learning' && styles.tabActive]}
          onPress={() => { hapticTap(); setTab('learning'); }}
        >
          <Text style={[styles.tabText, tab === 'learning' && styles.tabTextActive]}>Learning</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'spending' && styles.tabActive]}
          onPress={() => { hapticTap(); setTab('spending'); }}
        >
          <Text style={[styles.tabText, tab === 'spending' && styles.tabTextActive]}>Spending</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1B3A6B" />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tab === 'learning' && data && <LearningTab data={data} />}
          {tab === 'spending' && data && <SpendingTab data={data} />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function LearningTab({ data }: { data: any }) {
  const lessons  = data.lessons ?? [];
  const attempts = data.attempts ?? [];
  const badges   = data.recentBadges ?? [];
  const streak   = data.streak;

  return (
    <View>
      {lessons.length === 0 && attempts.length === 0 && badges.length === 0 && (
        <View style={styles.noBank}>
          <Text style={styles.noBankIcon}>📈</Text>
          <Text style={styles.noBankText}>No learning reports yet.</Text>
        </View>
      )}

      {/* Quick stats */}
      <View style={styles.statRow}>
        <StatMini icon="📚" value={lessons.filter((l: any) => l.completed).length} label="Lessons" />
        <StatMini icon="✅" value={attempts.filter((a: any) => a.passed).length} label="Quizzes Passed" />
        <StatMini icon="🔥" value={streak?.current_streak ?? 0} label="Streak" />
      </View>

      {/* Recent badges */}
      {badges.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Badges</Text>
          {badges.map((b: any, i: number) => (
            <View key={i} style={styles.badgeRow}>
              <Text style={styles.badgeIcon}>{b.badge?.icon_name}</Text>
              <Text style={styles.badgeName}>{b.badge?.name}</Text>
              <Text style={styles.badgeDate}>
                {new Date(b.earned_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function SpendingTab({ data }: { data: any }) {
  const { entries, byCat, bankConn } = data;

  const catLabels: Record<string, string> = {
    food: '🍔 Food', shopping: '🛍 Shopping', entertainment: '🎬 Entertainment',
    transport: '🚗 Transport', savings: '💰 Savings', other: '📦 Other',
  };

  const total = Object.values(byCat as Record<string, number>).reduce((a, b) => a + b, 0);

  if (!bankConn && entries.length === 0) {
    return (
      <View style={styles.noBank}>
        <Text style={styles.noBankIcon}>🏦</Text>
        <Text style={styles.noBankText}>No bank connected yet.</Text>
      </View>
    );
  }

  if (entries.length === 0 && Object.keys(byCat ?? {}).length === 0) {
    return (
      <View style={styles.noBank}>
        <Text style={styles.noBankIcon}>🧾</Text>
        <Text style={styles.noBankText}>No spending reports yet.</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.totalSpent}>Total this month: <Text style={styles.totalAmt}>${total.toFixed(2)}</Text></Text>

      {bankConn && (
        <Text style={styles.syncNote}>
          Connected: {bankConn.institution_name} · Last sync{' '}
          {new Date(bankConn.last_synced).toLocaleDateString()}
        </Text>
      )}

      {/* Category breakdown */}
      <Text style={styles.sectionTitle}>By Category</Text>
      {Object.entries(byCat as Record<string, number>).map(([cat, amt]) => (
        <View key={cat} style={styles.catRow}>
          <Text style={styles.catLabel}>{catLabels[cat] ?? cat}</Text>
          <Text style={styles.catAmt}>${Number(amt).toFixed(2)}</Text>
        </View>
      ))}

      {/* Recent transactions */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {entries.slice(0, 20).map((e: any, i: number) => (
        <View key={i} style={styles.txRow}>
          <Text style={styles.txDesc}>{e.description}</Text>
          <Text style={styles.txAmt}>-${Number(e.amount).toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
}

function StatMini({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={styles.statMini}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F8F9FC' },
  empty:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText:       { color: '#888', fontSize: 16 },
  childSelector:   { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  childChip:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50, backgroundColor: '#F0F0F0', marginRight: 8 },
  chipActive:      { backgroundColor: '#1B3A6B' },
  chipText:        { fontWeight: '600', color: '#555' },
  chipTextActive:  { color: '#fff' },
  tabs:            { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab:             { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive:       { borderBottomWidth: 3, borderBottomColor: '#1B3A6B' },
  tabText:         { fontSize: 14, fontWeight: '600', color: '#888' },
  tabTextActive:   { color: '#1B3A6B' },
  content:         { padding: 20, paddingBottom: 40 },
  statRow:         { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statMini:        { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center' },
  statIcon:        { fontSize: 20, marginBottom: 4 },
  statValue:       { fontSize: 22, fontWeight: '900', color: '#1B3A6B' },
  statLabel:       { fontSize: 11, color: '#888' },
  sectionTitle:    { fontSize: 15, fontWeight: '800', color: '#1B3A6B', marginTop: 20, marginBottom: 12 },
  badgeRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  badgeIcon:       { fontSize: 22, marginRight: 10 },
  badgeName:       { flex: 1, fontSize: 14, fontWeight: '600', color: '#333' },
  badgeDate:       { fontSize: 12, color: '#aaa' },
  noBank:          { alignItems: 'center', marginTop: 60 },
  noBankIcon:      { fontSize: 48, marginBottom: 12 },
  noBankText:      { fontSize: 16, color: '#888' },
  totalSpent:      { fontSize: 16, color: '#444', marginBottom: 4 },
  totalAmt:        { fontWeight: '800', color: '#1B3A6B' },
  syncNote:        { fontSize: 12, color: '#aaa', marginBottom: 16 },
  catRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  catLabel:        { fontSize: 14, color: '#444' },
  catAmt:          { fontSize: 14, fontWeight: '700', color: '#1B3A6B' },
  txRow:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  txDesc:          { fontSize: 13, color: '#444', flex: 1, marginRight: 8 },
  txAmt:           { fontSize: 13, fontWeight: '700', color: '#C62828' },
});
