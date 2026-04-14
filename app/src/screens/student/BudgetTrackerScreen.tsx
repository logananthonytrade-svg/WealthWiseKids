import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { checkAndAwardBudgetEntryBadges } from '../../utils/badgeUtils';
import BadgeAwardModal from '../../components/BadgeAwardModal';
import { BadgeRecord } from '../../utils/badgeUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetEntry {
  id: string;
  entry_type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string | null;
  entry_date: string;
  is_from_plaid: boolean;
}

interface CoinHistoryItem {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  label: string;
  icon: string;
  date: string;
}

interface NewEntry {
  entry_type: 'income' | 'expense';
  amount: string;
  category: string;
  description: string;
  entry_date: string;
}

type Mode = 'real' | 'coins';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATS = [
  { key: 'food',          label: 'Food',        emoji: '🍔', color: '#FF6B35' },
  { key: 'entertainment', label: 'Fun',          emoji: '🎬', color: '#9B27AF' },
  { key: 'shopping',      label: 'Shopping',     emoji: '🛍️',  color: '#1B3A6B' },
  { key: 'transport',     label: 'Transport',    emoji: '🚗', color: '#0D6E48' },
  { key: 'savings',       label: 'Savings',      emoji: '💰', color: '#27AE60' },
  { key: 'other',         label: 'Other',        emoji: '📦', color: '#7D7D7D' },
] as const;

const CAT_MAP = Object.fromEntries(CATS.map((c) => [c.key, c])) as Record<
  string, { key: string; label: string; emoji: string; color: string }
>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthBounds(offset: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const y = d.getFullYear();
  const m = d.getMonth();
  const start  = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const endDay = new Date(y, m + 1, 0).getDate();
  const end    = `${y}-${String(m + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
  const label  = d.toLocaleString('default', { month: 'long', year: 'numeric' });
  return { start, end, label };
}

function fmt(n: number) {
  return `$${Math.abs(n).toFixed(2)}`;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  income, spent, net,
}: { income: number; spent: number; net: number }) {
  const netPositive = net >= 0;
  return (
    <View style={ss.summaryCard}>
      <View style={ss.summaryCol}>
        <Text style={ss.summaryIcon}>📥</Text>
        <Text style={ss.summaryLabel}>Income</Text>
        <Text style={[ss.summaryAmt, { color: '#27AE60' }]}>{fmt(income)}</Text>
      </View>
      <View style={ss.summaryDivider} />
      <View style={ss.summaryCol}>
        <Text style={ss.summaryIcon}>💸</Text>
        <Text style={ss.summaryLabel}>Spent</Text>
        <Text style={[ss.summaryAmt, { color: '#C62828' }]}>{fmt(spent)}</Text>
      </View>
      <View style={ss.summaryDivider} />
      <View style={ss.summaryCol}>
        <Text style={ss.summaryIcon}>{netPositive ? '✅' : '⚠️'}</Text>
        <Text style={ss.summaryLabel}>{netPositive ? 'Left' : 'Over'}</Text>
        <Text style={[ss.summaryAmt, { color: netPositive ? '#1B3A6B' : '#C62828' }]}>
          {netPositive ? fmt(net) : `-${fmt(Math.abs(net))}`}
        </Text>
      </View>
    </View>
  );
}

function SplitGuide({
  needsPct, wantsPct, savingsPct, hasData,
}: { needsPct: number; wantsPct: number; savingsPct: number; hasData: boolean }) {
  if (!hasData) return null;

  const rows: Array<{ label: string; pct: number; target: number; color: string }> = [
    { label: 'Needs',   pct: needsPct,   target: 50, color: '#1B3A6B' },
    { label: 'Wants',   pct: wantsPct,   target: 30, color: '#9B27AF' },
    { label: 'Savings', pct: savingsPct, target: 20, color: '#27AE60' },
  ];

  return (
    <View style={ss.section}>
      <View style={ss.sectionHeader}>
        <Text style={ss.sectionTitle}>50 / 30 / 20 Guide</Text>
        <Text style={ss.sectionSub}>Actual vs target</Text>
      </View>
      {rows.map((r) => (
        <View key={r.label} style={ss.splitRow}>
          <Text style={ss.splitLabel}>{r.label}</Text>
          <View style={ss.splitBarWrap}>
            {/* Actual bar */}
            <View style={[ss.splitBarFill, { width: `${Math.min(r.pct, 100)}%` as any, backgroundColor: r.color }]} />
            {/* Target marker */}
            <View style={[ss.targetMark, { left: `${r.target}%` as any }]} />
          </View>
          <Text style={[ss.splitPct, r.pct > r.target + 5 ? { color: '#C62828' } : {}]}>
            {r.pct}%
          </Text>
        </View>
      ))}
      <Text style={ss.splitNote}>The dotted line shows your target. Tap any school lesson to learn more.</Text>
    </View>
  );
}

function CategoryBars({
  rows, totalSpent,
}: { rows: Array<{ key: string; label: string; emoji: string; color: string; total: number; pct: number }>; totalSpent: number }) {
  if (rows.length === 0) return null;
  return (
    <View style={ss.section}>
      <Text style={ss.sectionTitle}>Where Your Money Went</Text>
      {rows.map((cat) => (
        <View key={cat.key} style={ss.catRow}>
          <Text style={ss.catEmoji}>{cat.emoji}</Text>
          <View style={ss.catMid}>
            <View style={ss.catLabelRow}>
              <Text style={ss.catLabel}>{cat.label}</Text>
              <Text style={ss.catAmt}>{fmt(cat.total)}</Text>
            </View>
            <View style={ss.barTrack}>
              <View
                style={[ss.barFill, { width: `${cat.pct}%` as any, backgroundColor: cat.color }]}
              />
            </View>
          </View>
          <Text style={ss.catPct}>{cat.pct}%</Text>
        </View>
      ))}
    </View>
  );
}

function TransactionsList({ entries }: { entries: BudgetEntry[] }) {
  if (entries.length === 0) {
    return (
      <View style={ss.emptyTx}>
        <Text style={ss.emptyTxText}>No transactions this month.</Text>
        <Text style={ss.emptyTxSub}>Tap + to add one manually, or connect a bank to auto-import.</Text>
      </View>
    );
  }
  return (
    <View style={ss.section}>
      <Text style={ss.sectionTitle}>Recent Transactions</Text>
      {entries.slice(0, 30).map((e) => {
        const isIncome  = e.entry_type === 'income';
        const cat       = CAT_MAP[e.category];
        const emoji     = isIncome ? '💵' : (cat?.emoji ?? '📦');
        const label     = e.description ?? (isIncome ? 'Income' : (cat?.label ?? e.category));
        const dateLabel = e.entry_date.slice(5).replace('-', '/'); // MM/DD
        return (
          <View key={e.id} style={ss.txRow}>
            <View style={ss.txIconWrap}>
              <Text style={ss.txEmoji}>{emoji}</Text>
            </View>
            <View style={ss.txMid}>
              <Text style={ss.txLabel} numberOfLines={1}>{label}</Text>
              <Text style={ss.txDate}>
                {dateLabel}{e.is_from_plaid ? '  · auto' : ''}
              </Text>
            </View>
            <Text style={[ss.txAmt, { color: isIncome ? '#27AE60' : '#1B3A6B' }]}>
              {isIncome ? '+' : '-'}{fmt(Number(e.amount))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ConnectBankBanner({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={ss.bankBanner} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name="link-outline" size={18} color="#1B3A6B" />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={ss.bannerTitle}>Connect a bank account</Text>
        <Text style={ss.bannerSub}>Auto-import transactions so your budget stays updated.</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#1B3A6B" />
    </TouchableOpacity>
  );
}

function CoinsTab({
  balance, thisMonthEarned, thisMonthSpent, history, loaded,
}: {
  balance: number;
  thisMonthEarned: number;
  thisMonthSpent: number;
  history: CoinHistoryItem[];
  loaded: boolean;
}) {
  if (!loaded) {
    return <ActivityIndicator color="#1B3A6B" style={{ marginTop: 40 }} />;
  }
  return (
    <ScrollView contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>
      {/* Balance card */}
      <View style={ss.coinBalanceCard}>
        <Text style={ss.coinBalanceLabel}>Current Balance</Text>
        <Text style={ss.coinBalanceAmt}>🪙 {balance.toLocaleString()}</Text>
        <Text style={ss.coinBalanceSub}>Earn coins by completing lessons and quizzes</Text>
      </View>

      {/* This month summary */}
      <View style={ss.coinSummaryRow}>
        <View style={[ss.coinSummaryBox, { backgroundColor: '#F0FAF4' }]}>
          <Text style={ss.coinSummaryIcon}>📈</Text>
          <Text style={ss.coinSummaryVal}>+{thisMonthEarned}</Text>
          <Text style={ss.coinSummaryLabel}>Earned this month</Text>
        </View>
        <View style={[ss.coinSummaryBox, { backgroundColor: '#FFF0F0' }]}>
          <Text style={ss.coinSummaryIcon}>🛒</Text>
          <Text style={ss.coinSummaryVal}>-{thisMonthSpent}</Text>
          <Text style={ss.coinSummaryLabel}>Spent this month</Text>
        </View>
      </View>

      {/* History */}
      <View style={ss.section}>
        <Text style={ss.sectionTitle}>Coin History</Text>
        {history.length === 0 ? (
          <Text style={ss.emptyTxText}>No coin activity yet. Complete a lesson to earn!</Text>
        ) : (
          history.map((item) => (
            <View key={item.id} style={ss.txRow}>
              <View style={[ss.txIconWrap, { backgroundColor: item.type === 'earn' ? '#F0FAF4' : '#FFF0F0' }]}>
                <Text style={ss.txEmoji}>{item.icon}</Text>
              </View>
              <View style={ss.txMid}>
                <Text style={ss.txLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={ss.txDate}>{item.date.slice(5).replace('-', '/')}</Text>
              </View>
              <Text style={[ss.txAmt, { color: item.type === 'earn' ? '#27AE60' : '#C62828' }]}>
                {item.type === 'earn' ? '+' : '-'}{item.amount}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function AddEntryModal({
  visible, form, setForm, saving, onSave, onCancel,
}: {
  visible: boolean;
  form: NewEntry;
  setForm: React.Dispatch<React.SetStateAction<NewEntry>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={ss.modalOverlay}
      >
        <View style={ss.modalSheet}>
          <View style={ss.modalHandle} />
          <Text style={ss.modalTitle}>Add Transaction</Text>

          {/* Type toggle */}
          <View style={ss.typeRow}>
            {(['expense', 'income'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[ss.typeChip, form.entry_type === t && ss.typeChipActive]}
                onPress={() => setForm((f) => ({ ...f, entry_type: t }))}
              >
                <Text style={[ss.typeChipTxt, form.entry_type === t && ss.typeChipTxtActive]}>
                  {t === 'expense' ? '💸 Expense' : '💵 Income'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount */}
          <Text style={ss.fieldLabel}>Amount ($)</Text>
          <TextInput
            style={ss.input}
            value={form.amount}
            onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#aaa"
          />

          {/* Category (expense only) */}
          {form.entry_type === 'expense' && (
            <>
              <Text style={ss.fieldLabel}>Category</Text>
              <View style={ss.catGrid}>
                {CATS.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[ss.catChip, form.category === c.key && { backgroundColor: c.color }]}
                    onPress={() => setForm((f) => ({ ...f, category: c.key }))}
                  >
                    <Text style={ss.catChipEmoji}>{c.emoji}</Text>
                    <Text style={[ss.catChipLabel, form.category === c.key && { color: '#fff' }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Description */}
          <Text style={ss.fieldLabel}>Note (optional)</Text>
          <TextInput
            style={ss.input}
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="e.g. McDonald's, allowance…"
            placeholderTextColor="#aaa"
          />

          {/* Date */}
          <Text style={ss.fieldLabel}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={ss.input}
            value={form.entry_date}
            onChangeText={(v) => setForm((f) => ({ ...f, entry_date: v }))}
            placeholder={todayISO()}
            placeholderTextColor="#aaa"
          />

          {/* Buttons */}
          <View style={ss.modalBtns}>
            <TouchableOpacity style={ss.cancelBtn} onPress={onCancel}>
              <Text style={ss.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ss.saveBtn, saving && { opacity: 0.6 }]}
              onPress={onSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={ss.saveBtnTxt}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BudgetTrackerScreen() {
  const navigation        = useNavigation<any>();
  const { selectedChild } = useAuthStore();

  const [mode,        setMode]        = useState<Mode>('real');
  const [monthOffset, setMonthOffset] = useState(0);
  const [entries,     setEntries]     = useState<BudgetEntry[]>([]);
  const [hasBank,     setHasBank]     = useState<boolean | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [coinBalance, setCoinBalance] = useState(0);
  const [coinHistory, setCoinHistory] = useState<CoinHistoryItem[]>([]);
  const [coinsLoaded, setCoinsLoaded] = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [form,        setForm]        = useState<NewEntry>({
    entry_type: 'expense', amount: '', category: 'food', description: '', entry_date: todayISO(),
  });
  const [saving, setSaving] = useState(false);
  const [badgeQueue, setBadgeQueue] = useState<BadgeRecord[]>([]);

  // ── Load real money data ────────────────────────────────────────────────
  useEffect(() => {
    if (selectedChild) loadRealData();
  }, [selectedChild?.id, monthOffset]);

  // ── Load coin data on first tab switch ─────────────────────────────────
  useEffect(() => {
    if (mode === 'coins' && !coinsLoaded && selectedChild) loadCoinData();
  }, [mode]);

  const loadRealData = async () => {
    setLoading(true);
    const childId = selectedChild!.id;
    const { start, end } = getMonthBounds(monthOffset);

    const [entriesRes, bankRes] = await Promise.all([
      supabase
        .from('budget_entries')
        .select('id, entry_type, amount, category, description, entry_date, is_from_plaid')
        .eq('child_id', childId)
        .gte('entry_date', start)
        .lte('entry_date', end)
        .order('entry_date', { ascending: false }),
      supabase
        .from('plaid_connections')
        .select('id')
        .eq('child_id', childId)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

    setEntries((entriesRes.data ?? []) as BudgetEntry[]);
    setHasBank(!!bankRes.data);
    setLoading(false);
  };

  const loadCoinData = async () => {
    const childId = selectedChild!.id;

    const [coinRes, earnRes, spendRes] = await Promise.all([
      supabase.from('wealth_coins').select('balance').eq('child_id', childId).maybeSingle(),
      supabase
        .from('coin_transactions')
        .select('id, amount, reason, created_at')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('item_purchases')
        .select('id, purchased_at, store_items(name, icon, coin_cost)')
        .eq('child_id', childId)
        .order('purchased_at', { ascending: false })
        .limit(20),
    ]);

    setCoinBalance(coinRes.data?.balance ?? 0);

    const earns: CoinHistoryItem[] = (earnRes.data ?? []).map((tx: any) => ({
      id:     `earn-${tx.id}`,
      type:   'earn' as const,
      amount: Math.abs(tx.amount),
      label:  tx.reason ?? 'Coins earned',
      icon:   '🪙',
      date:   tx.created_at.slice(0, 10),
    }));

    const spends: CoinHistoryItem[] = (spendRes.data ?? []).map((p: any) => ({
      id:     `spend-${p.id}`,
      type:   'spend' as const,
      amount: p.store_items?.coin_cost ?? 0,
      label:  p.store_items?.name ?? 'Store item',
      icon:   p.store_items?.icon ?? '🛒',
      date:   p.purchased_at.slice(0, 10),
    }));

    const merged = [...earns, ...spends].sort((a, b) => b.date.localeCompare(a.date));
    setCoinHistory(merged);
    setCoinsLoaded(true);
  };

  const handleSaveEntry = async () => {
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a number greater than 0.');
      return;
    }
    if (form.entry_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.entry_date)) {
      Alert.alert('Invalid date', 'Use the format YYYY-MM-DD, e.g. 2026-04-12.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('budget_entries').insert({
      child_id:      selectedChild!.id,
      entry_type:    form.entry_type,
      amount,
      category:      form.entry_type === 'income' ? 'income' : form.category,
      description:   form.description.trim() || null,
      entry_date:    form.entry_date || todayISO(),
      is_from_plaid: false,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Error', 'Could not save entry. Please try again.');
      console.error('BudgetTracker insert:', error);
      return;
    }
    setShowModal(false);
    setForm({ entry_type: 'expense', amount: '', category: 'food', description: '', entry_date: todayISO() });
    loadRealData();
    // Check for budget entry + savings entry milestone badges
    const newBadges = await checkAndAwardBudgetEntryBadges(selectedChild!.id);
    if (newBadges.length > 0) setBadgeQueue(newBadges);
  };

  // ── Derived data ───────────────────────────────────────────────────────
  const { label: monthLabel } = getMonthBounds(monthOffset);

  const expenses    = entries.filter((e) => e.entry_type === 'expense');
  const incomeEntries = entries.filter((e) => e.entry_type === 'income');
  const totalSpent  = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalIncome = incomeEntries.reduce((s, e) => s + Number(e.amount), 0);
  const net         = totalIncome - totalSpent;

  const catMap: Record<string, number> = {};
  expenses.forEach((e) => { catMap[e.category] = (catMap[e.category] ?? 0) + Number(e.amount); });

  const categoryRows = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([k, total]) => ({
      ...(CAT_MAP[k] ?? { key: k, label: k, emoji: '📦', color: '#666' }),
      total,
      pct: totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0,
    }));

  const savedAmt   = catMap['savings']   ?? 0;
  const needsAmt   = catMap['transport'] ?? 0;
  const wantsAmt   = totalSpent - savedAmt - needsAmt;
  const savingsPct = totalSpent > 0 ? Math.round((savedAmt  / totalSpent) * 100) : 0;
  const needsPct   = totalSpent > 0 ? Math.round((needsAmt  / totalSpent) * 100) : 0;
  const wantsPct   = totalSpent > 0 ? Math.round((wantsAmt  / totalSpent) * 100) : 0;

  const now             = new Date();
  const thisMonthStart  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const thisMonthEarned = coinHistory
    .filter((h) => h.type === 'earn' && h.date >= thisMonthStart)
    .reduce((s, h) => s + h.amount, 0);
  const thisMonthSpent  = coinHistory
    .filter((h) => h.type === 'spend' && h.date >= thisMonthStart)
    .reduce((s, h) => s + h.amount, 0);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={ss.safe}>

      {/* Header */}
      <View style={ss.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={ss.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#1B3A6B" />
        </TouchableOpacity>
        <Text style={ss.headerTitle}>Budget Tracker</Text>
        {mode === 'real' ? (
          <TouchableOpacity style={ss.addBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="add-circle" size={30} color="#1B3A6B" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Mode tabs */}
      <View style={ss.tabs}>
        <TouchableOpacity
          style={[ss.tab, mode === 'real' && ss.tabActive]}
          onPress={() => setMode('real')}
        >
          <Text style={[ss.tabTxt, mode === 'real' && ss.tabTxtActive]}>💵  Real Money</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ss.tab, mode === 'coins' && ss.tabActive]}
          onPress={() => setMode('coins')}
        >
          <Text style={[ss.tabTxt, mode === 'coins' && ss.tabTxtActive]}>🪙  Coins</Text>
        </TouchableOpacity>
      </View>

      {/* Real Money tab */}
      {mode === 'real' && (
        loading ? (
          <ActivityIndicator color="#1B3A6B" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>

            {/* Month navigation */}
            <View style={ss.monthRow}>
              <TouchableOpacity onPress={() => setMonthOffset((o) => o - 1)} style={ss.monthArrow}>
                <Ionicons name="chevron-back" size={20} color="#1B3A6B" />
              </TouchableOpacity>
              <Text style={ss.monthLabel}>{monthLabel}</Text>
              <TouchableOpacity
                onPress={() => setMonthOffset((o) => Math.min(o + 1, 0))}
                style={[ss.monthArrow, monthOffset === 0 && { opacity: 0.3 }]}
                disabled={monthOffset === 0}
              >
                <Ionicons name="chevron-forward" size={20} color="#1B3A6B" />
              </TouchableOpacity>
            </View>

            {/* Connect bank banner */}
            {hasBank === false && (
              <ConnectBankBanner onPress={() => navigation.navigate('ConnectBank')} />
            )}

            {/* Summary */}
            <SummaryCard income={totalIncome} spent={totalSpent} net={net} />

            {/* 50/30/20 guide */}
            <SplitGuide
              needsPct={needsPct}
              wantsPct={wantsPct}
              savingsPct={savingsPct}
              hasData={totalSpent > 0}
            />

            {/* Category bars */}
            <CategoryBars rows={categoryRows} totalSpent={totalSpent} />

            {/* Transactions list */}
            <TransactionsList entries={entries} />

            <View style={{ height: 32 }} />
          </ScrollView>
        )
      )}

      {/* Coins tab */}
      {mode === 'coins' && (
        <CoinsTab
          balance={coinBalance}
          thisMonthEarned={thisMonthEarned}
          thisMonthSpent={thisMonthSpent}
          history={coinHistory}
          loaded={coinsLoaded}
        />
      )}

      {/* Add Entry Modal */}
      <AddEntryModal
        visible={showModal}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSaveEntry}
        onCancel={() => {
          setShowModal(false);
          setForm({ entry_type: 'expense', amount: '', category: 'food', description: '', entry_date: todayISO() });
        }}
      />

      {/* Badge Award Modal */}
      <BadgeAwardModal
        badges={badgeQueue}
        onDismiss={() => setBadgeQueue([])}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: '#F8F9FC' },
  scroll: { paddingHorizontal: 18, paddingTop: 12 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8EDF2',
  },
  backBtn:     { width: 40, alignItems: 'flex-start' },
  addBtn:      { width: 40, alignItems: 'flex-end' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1B3A6B' },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E8EDF2',
  },
  tab: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabActive:    { borderBottomColor: '#1B3A6B' },
  tabTxt:       { fontSize: 14, fontWeight: '600', color: '#999' },
  tabTxtActive: { color: '#1B3A6B' },

  // Month nav
  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthArrow: { padding: 6 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#1B3A6B' },

  // Connect bank banner
  bankBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E8F0FB', borderRadius: 12, padding: 14,
    marginBottom: 14, gap: 2,
  },
  bannerTitle: { fontSize: 13, fontWeight: '700', color: '#1B3A6B' },
  bannerSub:   { fontSize: 12, color: '#555', marginTop: 1 },

  // Summary card
  summaryCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  summaryCol:     { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, backgroundColor: '#E8EDF2', marginHorizontal: 6 },
  summaryIcon:    { fontSize: 20 },
  summaryLabel:   { fontSize: 11, color: '#888', fontWeight: '600', textTransform: 'uppercase' },
  summaryAmt:     { fontSize: 18, fontWeight: '800', color: '#1B3A6B' },

  // Section
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 15, fontWeight: '800', color: '#1B3A6B', marginBottom: 12 },
  sectionSub:    { fontSize: 12, color: '#888' },

  // Split guide
  splitRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  splitLabel:  { fontSize: 12, color: '#555', fontWeight: '600', width: 54 },
  splitBarWrap:{ flex: 1, height: 10, backgroundColor: '#EAECF0', borderRadius: 5, overflow: 'hidden', position: 'relative' },
  splitBarFill:{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 5 },
  targetMark:  { position: 'absolute', top: -2, bottom: -2, width: 2, backgroundColor: '#333' },
  splitPct:    { fontSize: 12, fontWeight: '700', color: '#333', width: 30, textAlign: 'right' },
  splitNote:   { fontSize: 11, color: '#999', marginTop: 6, lineHeight: 16 },

  // Category bars
  catRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  catEmoji:  { fontSize: 22, marginRight: 10 },
  catMid:    { flex: 1 },
  catLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catLabel:  { fontSize: 13, fontWeight: '600', color: '#333' },
  catAmt:    { fontSize: 13, fontWeight: '700', color: '#1B3A6B' },
  barTrack:  { height: 7, backgroundColor: '#EAECF0', borderRadius: 4, overflow: 'hidden' },
  barFill:   { height: 7, borderRadius: 4 },
  catPct:    { fontSize: 12, color: '#888', width: 34, textAlign: 'right', marginLeft: 8 },

  // Transactions
  emptyTx:     { alignItems: 'center', paddingVertical: 28 },
  emptyTxText: { fontSize: 15, color: '#888', fontWeight: '600', marginBottom: 6 },
  emptyTxSub:  { fontSize: 13, color: '#aaa', textAlign: 'center', paddingHorizontal: 16 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F2F5',
  },
  txIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F0F4FF', alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  txEmoji: { fontSize: 18 },
  txMid:   { flex: 1 },
  txLabel: { fontSize: 14, fontWeight: '600', color: '#222' },
  txDate:  { fontSize: 12, color: '#999', marginTop: 2 },
  txAmt:   { fontSize: 15, fontWeight: '800' },

  // Coin tab
  coinBalanceCard: {
    backgroundColor: '#1B3A6B', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16,
    marginHorizontal: 18, marginTop: 12,
  },
  coinBalanceLabel:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  coinBalanceAmt:    { fontSize: 40, fontWeight: '900', color: '#F0A500', letterSpacing: -1 },
  coinBalanceSub:    { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: 'center' },
  coinSummaryRow:    { flexDirection: 'row', gap: 12, paddingHorizontal: 18, marginBottom: 14 },
  coinSummaryBox:    { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  coinSummaryIcon:   { fontSize: 22 },
  coinSummaryVal:    { fontSize: 20, fontWeight: '800', color: '#1B3A6B' },
  coinSummaryLabel:  { fontSize: 11, color: '#666', fontWeight: '600', textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet:   {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24, gap: 0,
  },
  modalHandle:  { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle:   { fontSize: 20, fontWeight: '800', color: '#1B3A6B', marginBottom: 16 },
  typeRow:      { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeChip:     {
    flex: 1, paddingVertical: 12, borderRadius: 50,
    backgroundColor: '#F0F2F5', alignItems: 'center',
  },
  typeChipActive:    { backgroundColor: '#1B3A6B' },
  typeChipTxt:       { fontSize: 14, fontWeight: '700', color: '#555' },
  typeChipTxtActive: { color: '#fff' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 10, textTransform: 'uppercase' },
  input: {
    borderWidth: 1.5, borderColor: '#DDE2EA', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#222',
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0F2F5', borderRadius: 50,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  catChipEmoji: { fontSize: 15 },
  catChipLabel: { fontSize: 13, fontWeight: '600', color: '#444' },
  modalBtns:    { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 50,
    borderWidth: 2, borderColor: '#DDE2EA', alignItems: 'center',
  },
  cancelBtnTxt: { fontSize: 15, fontWeight: '700', color: '#666' },
  saveBtn:      { flex: 1, paddingVertical: 14, borderRadius: 50, backgroundColor: '#1B3A6B', alignItems: 'center' },
  saveBtnTxt:   { fontSize: 15, fontWeight: '700', color: '#fff' },
});
