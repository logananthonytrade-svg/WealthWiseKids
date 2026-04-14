import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetEntry {
  id:           string;
  entry_type:   'income' | 'expense';
  amount:       number;
  category:     string;
  description:  string | null;
  entry_date:   string;        // YYYY-MM-DD
  is_from_plaid: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_META: Record<string, { label: string; emoji: string; color: string; bucket: '50' | '30' | '20' }> = {
  food:          { label: 'Food',        emoji: '🍔', color: '#FF6B35', bucket: '50' },
  transport:     { label: 'Transport',   emoji: '🚗', color: '#0D6E48', bucket: '50' },
  entertainment: { label: 'Fun',         emoji: '🎬', color: '#9B27AF', bucket: '30' },
  shopping:      { label: 'Shopping',    emoji: '🛍️',  color: '#1B3A6B', bucket: '30' },
  savings:       { label: 'Savings',     emoji: '💰', color: '#27AE60', bucket: '20' },
  other:         { label: 'Other',       emoji: '📦', color: '#7D7D7D', bucket: '30' },
};

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${Math.abs(n).toFixed(2)}`;
}

function monthKey(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

function monthBounds(key: string): { start: string; end: string } {
  const [y, m] = key.split('-').map(Number);
  const endDay = new Date(y, m, 0).getDate();
  return {
    start: `${key}-01`,
    end:   `${key}-${String(endDay).padStart(2, '0')}`,
  };
}

function pctChange(a: number, b: number): number | null {
  if (b === 0) return null;
  return Math.round(((a - b) / b) * 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InsightChip({
  emoji, title, body, highlight,
}: { emoji: string; title: string; body: string; highlight?: 'good' | 'warn' | 'info' }) {
  const bg =
    highlight === 'good' ? '#F0FAF4' :
    highlight === 'warn' ? '#FFF8E7' :
    '#EEF3FF';
  const titleColor =
    highlight === 'good' ? '#0D6E48' :
    highlight === 'warn' ? '#B8860B' :
    '#1B3A6B';
  return (
    <View style={[ins.chip, { backgroundColor: bg }]}>
      <Text style={ins.chipEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[ins.chipTitle, { color: titleColor }]}>{title}</Text>
        <Text style={ins.chipBody}>{body}</Text>
      </View>
    </View>
  );
}

function TrendBar({
  label, amount, maxAmount, isCurrentMonth,
}: { label: string; amount: number; maxAmount: number; isCurrentMonth: boolean }) {
  const pct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  return (
    <View style={ss.trendRow}>
      <Text style={ss.trendLabel}>{label}</Text>
      <View style={ss.trendTrack}>
        <View style={[
          ss.trendFill,
          { width: `${pct}%` as any },
          isCurrentMonth ? ss.trendFillCurrent : {},
        ]} />
      </View>
      <Text style={[ss.trendAmt, isCurrentMonth ? { color: '#1B3A6B', fontWeight: '800' } : {}]}>
        {fmt(amount)}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SpendingAnalyzerScreen() {
  const navigation        = useNavigation<any>();
  const { selectedChild } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<BudgetEntry[]>([]);

  useEffect(() => {
    if (selectedChild) load();
  }, [selectedChild?.id]);

  const load = async () => {
    setLoading(true);
    // Fetch last 6 complete months + current month = 7 months of data
    const oldest = monthBounds(monthKey(-6)).start;
    const newest = monthBounds(monthKey(0)).end;

    const { data } = await supabase
      .from('budget_entries')
      .select('id, entry_type, amount, category, description, entry_date, is_from_plaid')
      .eq('child_id', selectedChild!.id)
      .gte('entry_date', oldest)
      .lte('entry_date', newest)
      .order('entry_date', { ascending: false });

    setEntries((data ?? []) as BudgetEntry[]);
    setLoading(false);
  };

  // ── Derived analytics ────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const expenses = entries.filter((e) => e.entry_type === 'expense');
    const incomes  = entries.filter((e) => e.entry_type === 'income');

    // Per-month totals (last 6 months + current)
    const monthKeys = Array.from({ length: 7 }, (_, i) => monthKey(i - 6));
    const monthlySpend: Record<string, number> = {};
    const monthlyIncome: Record<string, number> = {};
    monthKeys.forEach((k) => { monthlySpend[k] = 0; monthlyIncome[k] = 0; });

    expenses.forEach((e) => {
      const k = e.entry_date.slice(0, 7);
      if (k in monthlySpend) monthlySpend[k] += Number(e.amount);
    });
    incomes.forEach((e) => {
      const k = e.entry_date.slice(0, 7);
      if (k in monthlyIncome) monthlyIncome[k] += Number(e.amount);
    });

    const currentKey  = monthKey(0);
    const lastKey     = monthKey(-1);
    const curSpend    = monthlySpend[currentKey] ?? 0;
    const lastSpend   = monthlySpend[lastKey]    ?? 0;
    const curIncome   = monthlyIncome[currentKey] ?? 0;
    const spendChange = pctChange(curSpend, lastSpend);

    // Day-of-week breakdown (expenses only, current month)
    const { start: curStart } = monthBounds(currentKey);
    const curExpenses = expenses.filter((e) => e.entry_date >= curStart);
    const dowTotals   = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
    const dowCounts   = [0, 0, 0, 0, 0, 0, 0];
    curExpenses.forEach((e) => {
      const dow = new Date(e.entry_date + 'T12:00:00').getDay();
      dowTotals[dow] += Number(e.amount);
      dowCounts[dow] += 1;
    });
    const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const maxDow     = Math.max(...dowTotals, 1);

    // Category totals (current month)
    const catMap: Record<string, number> = {};
    curExpenses.forEach((e) => { catMap[e.category] = (catMap[e.category] ?? 0) + Number(e.amount); });
    const catRows = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([k, total]) => ({
        ...( CAT_META[k] ?? { label: k, emoji: '📦', color: '#7D7D7D', bucket: '30' as const }),
        key: k, total,
        pct: curSpend > 0 ? Math.round((total / curSpend) * 100) : 0,
      }));

    // Top merchants (by description, current month)
    const merchantMap: Record<string, number> = {};
    curExpenses.forEach((e) => {
      const key = (e.description ?? e.category).trim();
      if (key) merchantMap[key] = (merchantMap[key] ?? 0) + Number(e.amount);
    });
    const topMerchants = Object.entries(merchantMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }));

    // Daily average (days elapsed in current month)
    const today        = new Date();
    const daysElapsed  = today.getDate();
    const dailyAvg     = daysElapsed > 0 ? curSpend / daysElapsed : 0;
    const projectedEOM = dailyAvg * new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    // 50/30/20 breakdown (current month)
    const needs  = (catMap['food'] ?? 0) + (catMap['transport'] ?? 0);
    const wants  = (catMap['entertainment'] ?? 0) + (catMap['shopping'] ?? 0) + (catMap['other'] ?? 0);
    const saved  = catMap['savings'] ?? 0;

    // Insights
    const insights: Array<{ emoji: string; title: string; body: string; highlight: 'good' | 'warn' | 'info' }> = [];

    if (spendChange !== null) {
      if (spendChange < 0) {
        insights.push({ emoji: '📉', title: `Spent ${Math.abs(spendChange)}% less than last month`, body: `You're trending in the right direction. Keep it up!`, highlight: 'good' });
      } else if (spendChange > 20) {
        insights.push({ emoji: '⚠️', title: `Spending up ${spendChange}% vs last month`, body: `You've spent ${fmt(curSpend - lastSpend)} more than last month. Check your top categories.`, highlight: 'warn' });
      } else if (spendChange > 0) {
        insights.push({ emoji: '📊', title: `Spending up ${spendChange}% vs last month`, body: `Slight increase — review your categories to stay on track.`, highlight: 'info' });
      }
    }

    if (catRows.length > 0) {
      const top = catRows[0];
      insights.push({ emoji: top.emoji, title: `${top.label} is your biggest spend`, body: `${top.pct}% of this month's expenses — ${fmt(top.total)} so far.`, highlight: top.pct > 50 ? 'warn' : 'info' });
    }

    if (saved > 0 && curSpend > 0) {
      const savePct = Math.round((saved / (curSpend + saved)) * 100);
      if (savePct >= 20) {
        insights.push({ emoji: '💰', title: `Great savings rate: ${savePct}%`, body: `You're hitting the "20" in 50/30/20. Stellar habit!`, highlight: 'good' });
      } else {
        insights.push({ emoji: '💡', title: `Savings rate: ${savePct}%`, body: `Aim for 20% of your budget. Try adding ${fmt(curSpend * 0.2 - saved)} more this month.`, highlight: 'info' });
      }
    }

    if (projectedEOM > 0 && curIncome > 0 && projectedEOM > curIncome * 1.1) {
      insights.push({ emoji: '🚨', title: 'On track to overspend', body: `At your current pace you'll spend ${fmt(projectedEOM)}. Your income this month is ${fmt(curIncome)}.`, highlight: 'warn' });
    }

    const maxMonthSpend = Math.max(...Object.values(monthlySpend), 1);

    return {
      monthKeys, monthlySpend, monthlyIncome,
      currentKey, lastKey, curSpend, lastSpend, curIncome,
      spendChange, dailyAvg, projectedEOM,
      catRows, topMerchants, insights,
      dowTotals, dowCounts, DOW_LABELS, maxDow,
      needs, wants, saved,
      maxMonthSpend,
      hasData: expenses.length > 0,
    };
  }, [entries]);

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={ss.safe}>
        <ActivityIndicator color="#1B3A6B" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={ss.safe}>

      {/* Header */}
      <View style={ss.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={ss.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#1B3A6B" />
        </TouchableOpacity>
        <Text style={ss.headerTitle}>Spending Analyzer</Text>
        <TouchableOpacity onPress={load} style={ss.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#1B3A6B" />
        </TouchableOpacity>
      </View>

      {!analytics.hasData ? (
        <View style={ss.emptyState}>
          <Text style={ss.emptyEmoji}>📊</Text>
          <Text style={ss.emptyTitle}>No spending data yet</Text>
          <Text style={ss.emptySub}>Add transactions in the Budget Tracker or connect a bank account to see your analysis here.</Text>
          <TouchableOpacity style={ss.emptyBtn} onPress={() => navigation.navigate('BudgetTracker')}>
            <Text style={ss.emptyBtnTxt}>Open Budget Tracker</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>

          {/* ── This Month Summary ─────────────────────────────── */}
          <View style={ss.card}>
            <Text style={ss.cardTitle}>📅 {monthLabel(analytics.currentKey)}</Text>
            <View style={ss.summaryRow}>
              <View style={ss.summaryBox}>
                <Text style={ss.summaryLbl}>Spent</Text>
                <Text style={[ss.summaryVal, { color: '#C62828' }]}>{fmt(analytics.curSpend)}</Text>
              </View>
              <View style={ss.summaryDiv} />
              <View style={ss.summaryBox}>
                <Text style={ss.summaryLbl}>Income</Text>
                <Text style={[ss.summaryVal, { color: '#27AE60' }]}>{fmt(analytics.curIncome)}</Text>
              </View>
              <View style={ss.summaryDiv} />
              <View style={ss.summaryBox}>
                <Text style={ss.summaryLbl}>Daily avg</Text>
                <Text style={ss.summaryVal}>{fmt(analytics.dailyAvg)}</Text>
              </View>
            </View>

            {/* Projected EOM */}
            <View style={ss.projRow}>
              <Ionicons name="trending-up-outline" size={15} color="#888" />
              <Text style={ss.projText}>
                {'  '}Projected month-end:{' '}
                <Text style={{ fontWeight: '800', color: analytics.projectedEOM > analytics.curIncome && analytics.curIncome > 0 ? '#C62828' : '#1B3A6B' }}>
                  {fmt(analytics.projectedEOM)}
                </Text>
              </Text>
            </View>

            {/* vs last month pill */}
            {analytics.spendChange !== null && (
              <View style={[ss.changePill,
                analytics.spendChange < 0 ? ss.changePillGood :
                analytics.spendChange > 20 ? ss.changePillWarn : ss.changePillNeutral
              ]}>
                <Text style={[ss.changePillTxt,
                  analytics.spendChange < 0 ? { color: '#0D6E48' } :
                  analytics.spendChange > 20 ? { color: '#B8860B' } : { color: '#1B3A6B' }
                ]}>
                  {analytics.spendChange < 0 ? '▼' : '▲'} {Math.abs(analytics.spendChange)}% vs last month
                </Text>
              </View>
            )}
          </View>

          {/* ── Smart Insights ─────────────────────────────────── */}
          {analytics.insights.length > 0 && (
            <View style={ss.card}>
              <Text style={ss.cardTitle}>💡 Smart Insights</Text>
              {analytics.insights.map((ins, i) => (
                <InsightChip key={i} {...ins} />
              ))}
            </View>
          )}

          {/* ── 6-Month Spending Trend ─────────────────────────── */}
          <View style={ss.card}>
            <Text style={ss.cardTitle}>📈 6-Month Trend</Text>
            {analytics.monthKeys.map((k) => (
              <TrendBar
                key={k}
                label={monthLabel(k).split(' ')[0]}
                amount={analytics.monthlySpend[k]}
                maxAmount={analytics.maxMonthSpend}
                isCurrentMonth={k === analytics.currentKey}
              />
            ))}
          </View>

          {/* ── Category Breakdown ─────────────────────────────── */}
          {analytics.catRows.length > 0 && (
            <View style={ss.card}>
              <Text style={ss.cardTitle}>🏷️ Spending by Category</Text>
              {analytics.catRows.map((cat) => (
                <View key={cat.key} style={ss.catRow}>
                  <View style={[ss.catDot, { backgroundColor: cat.color }]} />
                  <Text style={ss.catEmoji}>{cat.emoji}</Text>
                  <View style={ss.catMid}>
                    <View style={ss.catLblRow}>
                      <Text style={ss.catLabel}>{cat.label}</Text>
                      <View style={ss.catRight}>
                        <Text style={ss.catAmt}>{fmt(cat.total)}</Text>
                        <Text style={ss.catPct}> · {cat.pct}%</Text>
                      </View>
                    </View>
                    <View style={ss.barTrack}>
                      <View style={[ss.barFill, { width: `${cat.pct}%` as any, backgroundColor: cat.color }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── 50 / 30 / 20 Status ────────────────────────────── */}
          {analytics.curSpend > 0 && (
            <View style={ss.card}>
              <Text style={ss.cardTitle}>⚖️ 50 / 30 / 20 Status</Text>
              {[
                { label: 'Needs (food + transport)',  target: 50, actual: Math.round((analytics.needs  / analytics.curSpend) * 100), color: '#1B3A6B' },
                { label: 'Wants (fun + shopping)',    target: 30, actual: Math.round((analytics.wants  / analytics.curSpend) * 100), color: '#9B27AF' },
                { label: 'Savings',                   target: 20, actual: Math.round((analytics.saved  / analytics.curSpend) * 100), color: '#27AE60' },
              ].map((r) => {
                const over = r.actual > r.target + 5;
                return (
                  <View key={r.label} style={ss.splitRow}>
                    <View style={ss.splitLeft}>
                      <Text style={ss.splitLabel}>{r.label}</Text>
                      <Text style={[ss.splitStatus, { color: over ? '#C62828' : '#27AE60' }]}>
                        {r.actual}% <Text style={ss.splitGoal}>(goal: {r.target}%)</Text>
                      </Text>
                    </View>
                    <View style={ss.splitBarWrap}>
                      <View style={[ss.splitBarFill, { width: `${Math.min(r.actual, 100)}%` as any, backgroundColor: r.color }]} />
                      <View style={[ss.targetLine, { left: `${r.target}%` as any }]} />
                    </View>
                  </View>
                );
              })}
              <Text style={ss.splitNote}>Dotted line = your target. Savings below 20%? Mark transfers as "savings" in Budget Tracker.</Text>
            </View>
          )}

          {/* ── Day-of-Week Patterns ───────────────────────────── */}
          {analytics.curSpend > 0 && (
            <View style={ss.card}>
              <Text style={ss.cardTitle}>📅 When You Spend Most</Text>
              <Text style={ss.cardSub}>This month, by day of week</Text>
              <View style={ss.dowRow}>
                {analytics.DOW_LABELS.map((lbl, i) => {
                  const h = analytics.maxDow > 0 ? Math.round((analytics.dowTotals[i] / analytics.maxDow) * 72) : 0;
                  const isMax = analytics.dowTotals[i] === analytics.maxDow && analytics.maxDow > 0;
                  return (
                    <View key={lbl} style={ss.dowCol}>
                      <View style={ss.dowBarWrap}>
                        <View style={[ss.dowBar, { height: Math.max(h, 4), backgroundColor: isMax ? '#F0A500' : '#1B3A6B' }]} />
                      </View>
                      <Text style={[ss.dowLabel, isMax && { color: '#F0A500', fontWeight: '800' }]}>{lbl}</Text>
                      {analytics.dowTotals[i] > 0 && (
                        <Text style={ss.dowAmt}>{fmt(analytics.dowTotals[i])}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Top Merchants ──────────────────────────────────── */}
          {analytics.topMerchants.length > 0 && (
            <View style={ss.card}>
              <Text style={ss.cardTitle}>🏪 Where You Spend</Text>
              <Text style={ss.cardSub}>Top spending descriptions this month</Text>
              {analytics.topMerchants.map((m, i) => (
                <View key={m.name} style={ss.merchantRow}>
                  <View style={[ss.rankBadge, i === 0 && { backgroundColor: '#F0A500' }]}>
                    <Text style={ss.rankTxt}>{i + 1}</Text>
                  </View>
                  <Text style={ss.merchantName} numberOfLines={1}>{m.name}</Text>
                  <Text style={ss.merchantAmt}>{fmt(m.total)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Insight chip styles (separate to avoid name collision) ──────────────────
const ins = StyleSheet.create({
  chip: {
    flexDirection: 'row', borderRadius: 12, padding: 12,
    marginBottom: 8, alignItems: 'flex-start', gap: 10,
  },
  chipEmoji: { fontSize: 20, marginTop: 1 },
  chipTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  chipBody:  { fontSize: 12, color: '#555', lineHeight: 17 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8F9FC' },
  scroll: { paddingHorizontal: 18, paddingTop: 14 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8EDF2',
  },
  backBtn:    { width: 40, alignItems: 'flex-start' },
  refreshBtn: { width: 40, alignItems: 'flex-end' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1B3A6B' },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1B3A6B', marginBottom: 4 },
  cardSub:   { fontSize: 12, color: '#999', marginBottom: 12 },

  // Summary row
  summaryRow: { flexDirection: 'row', marginBottom: 12, marginTop: 8 },
  summaryBox: { flex: 1, alignItems: 'center' },
  summaryDiv: { width: 1, backgroundColor: '#E8EDF2', marginHorizontal: 4 },
  summaryLbl: { fontSize: 11, color: '#888', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  summaryVal: { fontSize: 17, fontWeight: '900', color: '#1B3A6B' },

  // Projected
  projRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  projText: { fontSize: 13, color: '#888' },

  // Change pill
  changePill: {
    alignSelf: 'flex-start', borderRadius: 50,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  changePillGood:    { backgroundColor: '#F0FAF4' },
  changePillWarn:    { backgroundColor: '#FFF8E7' },
  changePillNeutral: { backgroundColor: '#EEF3FF' },
  changePillTxt: { fontSize: 13, fontWeight: '700' },

  // Trend bars
  trendRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  trendLabel:       { fontSize: 12, color: '#888', width: 32, fontWeight: '600' },
  trendTrack:       { flex: 1, height: 10, backgroundColor: '#EAECF0', borderRadius: 5, overflow: 'hidden', marginHorizontal: 8 },
  trendFill:        { height: 10, backgroundColor: '#B0C4DE', borderRadius: 5 },
  trendFillCurrent: { backgroundColor: '#1B3A6B' },
  trendAmt:         { fontSize: 12, color: '#888', width: 58, textAlign: 'right' },

  // Category rows
  catRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  catDot:    { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  catEmoji:  { fontSize: 18, marginRight: 8 },
  catMid:    { flex: 1 },
  catLblRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catLabel:  { fontSize: 13, fontWeight: '600', color: '#333' },
  catRight:  { flexDirection: 'row', alignItems: 'center' },
  catAmt:    { fontSize: 13, fontWeight: '700', color: '#1B3A6B' },
  catPct:    { fontSize: 12, color: '#999' },
  barTrack:  { height: 7, backgroundColor: '#EAECF0', borderRadius: 4, overflow: 'hidden' },
  barFill:   { height: 7, borderRadius: 4 },

  // 50/30/20
  splitRow:     { marginBottom: 14 },
  splitLeft:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  splitLabel:   { fontSize: 13, color: '#555', fontWeight: '600', flex: 1 },
  splitStatus:  { fontSize: 13, fontWeight: '800' },
  splitGoal:    { fontSize: 11, fontWeight: '400', color: '#aaa' },
  splitBarWrap: { height: 10, backgroundColor: '#EAECF0', borderRadius: 5, overflow: 'hidden', position: 'relative' },
  splitBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 5 },
  targetLine:   { position: 'absolute', top: -1, bottom: -1, width: 2, backgroundColor: '#333' },
  splitNote:    { fontSize: 11, color: '#aaa', marginTop: 6, lineHeight: 16 },

  // Day of week chart
  dowRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingTop: 8, marginTop: 8,
  },
  dowCol:      { flex: 1, alignItems: 'center' },
  dowBarWrap:  { height: 80, justifyContent: 'flex-end', marginBottom: 4 },
  dowBar:      { width: 22, borderRadius: 4, minHeight: 4 },
  dowLabel:    { fontSize: 11, color: '#888', fontWeight: '600' },
  dowAmt:      { fontSize: 9, color: '#aaa', marginTop: 1 },

  // Top merchants
  merchantRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F2F5',
  },
  rankBadge: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8EDF2',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  rankTxt:      { fontSize: 12, fontWeight: '800', color: '#1B3A6B' },
  merchantName: { flex: 1, fontSize: 14, color: '#333', fontWeight: '600' },
  merchantAmt:  { fontSize: 14, fontWeight: '800', color: '#1B3A6B' },

  // Empty state
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1B3A6B', marginBottom: 8 },
  emptySub:   { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  emptyBtn: {
    backgroundColor: '#1B3A6B', borderRadius: 50, paddingHorizontal: 28, paddingVertical: 13,
  },
  emptyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
