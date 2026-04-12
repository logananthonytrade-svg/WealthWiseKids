import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'goal' | 'interest';
type Freq = 'daily' | 'weekly' | 'monthly';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
}

function defaultTarget(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split('T')[0];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ label }: { label: string }) {
  return <Text style={ss.fieldLabel}>{label}</Text>;
}

function NumberInput({
  value, onChange, placeholder, prefix,
}: { value: string; onChange: (v: string) => void; placeholder: string; prefix?: string }) {
  return (
    <View style={ss.inputWrap}>
      {prefix ? <Text style={ss.inputPrefix}>{prefix}</Text> : null}
      <TextInput
        style={[ss.input, prefix ? { paddingLeft: 28 } : {}]}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor="#bbb"
      />
    </View>
  );
}

function ResultBar({
  label, value, highlight, note,
}: { label: string; value: string; highlight?: boolean; note?: string }) {
  return (
    <View style={[ss.resultBar, highlight && ss.resultBarHighlight]}>
      <View style={{ flex: 1 }}>
        <Text style={[ss.resultLabel, highlight && ss.resultLabelHL]}>{label}</Text>
        {note ? <Text style={ss.resultNote}>{note}</Text> : null}
      </View>
      <Text style={[ss.resultVal, highlight && ss.resultValHL]}>{value}</Text>
    </View>
  );
}

function ProgressArc({
  currentPct, targetAmt,
}: { currentPct: number; targetAmt: number }) {
  const filled = Math.min(Math.round(currentPct), 100);
  const color  = filled >= 100 ? '#27AE60' : filled >= 50 ? '#F0A500' : '#1B3A6B';
  return (
    <View style={ss.arcWrap}>
      <View style={ss.arcBg}>
        <View style={[ss.arcFill, { width: `${filled}%` as any, backgroundColor: color }]} />
      </View>
      <View style={ss.arcLabelRow}>
        <Text style={ss.arcPct}>{filled}% saved</Text>
        <Text style={ss.arcTarget}>Goal: {fmt(targetAmt)}</Text>
      </View>
    </View>
  );
}

// ─── Goal Planner Tab ─────────────────────────────────────────────────────────

function GoalPlanner() {
  const [goalName, setGoalName]   = useState('');
  const [target,   setTarget]     = useState('');
  const [current,  setCurrent]    = useState('');
  const [deadline, setDeadline]   = useState(defaultTarget());
  const [freq,     setFreq]       = useState<Freq>('weekly');

  const result = useMemo(() => {
    const targetAmt  = parseFloat(target);
    const currentAmt = parseFloat(current) || 0;
    if (isNaN(targetAmt) || targetAmt <= 0) return null;

    const days       = daysUntil(deadline);
    const remaining  = Math.max(0, targetAmt - currentAmt);
    const weeks      = days / 7;
    const months     = days / 30.44;
    const currentPct = targetAmt > 0 ? (currentAmt / targetAmt) * 100 : 0;

    const daily   = days   > 0 ? remaining / days   : remaining;
    const weekly  = weeks  > 0 ? remaining / weeks  : remaining;
    const monthly = months > 0 ? remaining / months : remaining;

    return { targetAmt, currentAmt, remaining, days, daily, weekly, monthly, currentPct };
  }, [target, current, deadline]);

  const FREQS: Array<{ key: Freq; label: string }> = [
    { key: 'daily',   label: 'Daily' },
    { key: 'weekly',  label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
  ];

  return (
    <ScrollView contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* Input card */}
      <View style={ss.card}>
        <Text style={ss.cardTitle}>📋 Set Your Goal</Text>

        <FieldLabel label="What are you saving for?" />
        <TextInput
          style={ss.input}
          value={goalName}
          onChangeText={setGoalName}
          placeholder="e.g. New sneakers, gaming PC, trip…"
          placeholderTextColor="#bbb"
        />

        <FieldLabel label="Target amount" />
        <NumberInput value={target} onChange={setTarget} placeholder="250.00" prefix="$" />

        <FieldLabel label="You already have" />
        <NumberInput value={current} onChange={setCurrent} placeholder="0.00" prefix="$" />

        <FieldLabel label="Target date (YYYY-MM-DD)" />
        <TextInput
          style={ss.input}
          value={deadline}
          onChangeText={setDeadline}
          placeholder={defaultTarget()}
          placeholderTextColor="#bbb"
        />

        {/* Frequency toggle */}
        <FieldLabel label="Show me how much to save" />
        <View style={ss.freqRow}>
          {FREQS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[ss.freqChip, freq === f.key && ss.freqChipActive]}
              onPress={() => setFreq(f.key)}
            >
              <Text style={[ss.freqTxt, freq === f.key && ss.freqTxtActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Results card */}
      {result && (
        <View style={ss.card}>
          <Text style={ss.cardTitle}>
            {goalName.trim() ? `🎯 ${goalName}` : '🎯 Your Goal'}
          </Text>

          {/* Progress bar */}
          {result.currentAmt > 0 && (
            <ProgressArc currentPct={result.currentPct} targetAmt={result.targetAmt} />
          )}

          <ResultBar
            label={`Save ${freq === 'daily' ? 'per day' : freq === 'weekly' ? 'per week' : 'per month'}`}
            value={fmt(freq === 'daily' ? result.daily : freq === 'weekly' ? result.weekly : result.monthly)}
            highlight
          />
          <ResultBar
            label="Still need to save"
            value={fmt(result.remaining)}
          />
          <ResultBar
            label="Days until goal"
            value={`${result.days} days`}
            note={result.days < 7 ? '⚠️ Very soon!' : result.days > 365 ? 'Over a year away — break it into milestones!' : undefined}
          />
          <ResultBar
            label="Daily"
            value={fmt(result.daily)}
          />
          <ResultBar
            label="Weekly"
            value={fmt(result.weekly)}
          />
          <ResultBar
            label="Monthly"
            value={fmt(result.monthly)}
          />

          {/* Savings tip */}
          <View style={ss.tip}>
            <Text style={ss.tipText}>
              💡 Try automating {fmt(result.weekly)} every week into a savings account — you won't even notice it leaving!
            </Text>
          </View>
        </View>
      )}

      {/* Placeholder when no input */}
      {!result && (
        <View style={ss.emptyCard}>
          <Text style={ss.emptyEmoji}>🐷</Text>
          <Text style={ss.emptyTitle}>Enter your goal above</Text>
          <Text style={ss.emptySub}>We'll show exactly how much to set aside to hit it on time.</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Interest Calculator Tab ──────────────────────────────────────────────────

function InterestCalc() {
  const [principal, setPrincipal] = useState('');
  const [rate,      setRate]      = useState('');
  const [years,     setYears]     = useState('');
  const [compound,  setCompound]  = useState(true);   // simple vs compound

  const result = useMemo(() => {
    const p = parseFloat(principal);
    const r = parseFloat(rate) / 100;
    const t = parseFloat(years);
    if (isNaN(p) || isNaN(r) || isNaN(t) || p <= 0 || r <= 0 || t <= 0) return null;

    const compoundFinal = p * Math.pow(1 + r, t);
    const simpleFinal   = p + p * r * t;

    const compoundInterest = compoundFinal - p;
    const simpleInterest   = simpleFinal   - p;

    // Year-by-year compound growth
    const timeline = Array.from({ length: Math.min(Math.ceil(t), 30) }, (_, i) => ({
      year: i + 1,
      balance: p * Math.pow(1 + r, i + 1),
    }));

    // Rule of 72
    const ruleOf72 = r > 0 ? Math.round(72 / (r * 100)) : null;

    return {
      p, r, t,
      compoundFinal, simpleFinal,
      compoundInterest, simpleInterest,
      difference: compoundInterest - simpleInterest,
      timeline,
      ruleOf72,
      doublings: t / (ruleOf72 ?? 1),
    };
  }, [principal, rate, years, compound]);

  const displayFinal    = compound ? result?.compoundFinal    : result?.simpleFinal;
  const displayInterest = compound ? result?.compoundInterest : result?.simpleInterest;

  return (
    <ScrollView contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* Input card */}
      <View style={ss.card}>
        <Text style={ss.cardTitle}>📈 Interest Calculator</Text>

        <FieldLabel label="Starting amount" />
        <NumberInput value={principal} onChange={setPrincipal} placeholder="1000.00" prefix="$" />

        <FieldLabel label="Annual interest rate (%)" />
        <NumberInput value={rate} onChange={setRate} placeholder="5.0" />

        <FieldLabel label="Years" />
        <NumberInput value={years} onChange={setYears} placeholder="10" />

        {/* Simple vs Compound toggle */}
        <FieldLabel label="Interest type" />
        <View style={ss.freqRow}>
          <TouchableOpacity
            style={[ss.freqChip, compound && ss.freqChipActive]}
            onPress={() => setCompound(true)}
          >
            <Text style={[ss.freqTxt, compound && ss.freqTxtActive]}>🔄 Compound</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ss.freqChip, !compound && ss.freqChipActive]}
            onPress={() => setCompound(false)}
          >
            <Text style={[ss.freqTxt, !compound && ss.freqTxtActive]}>📏 Simple</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      {result && displayFinal !== undefined && displayInterest !== undefined && (
        <>
          <View style={ss.card}>
            <Text style={ss.cardTitle}>
              {compound ? '🔄 Compound Interest' : '📏 Simple Interest'} Results
            </Text>

            <ResultBar
              label="Final balance"
              value={fmt(displayFinal)}
              highlight
            />
            <ResultBar label="Starting amount"    value={fmt(result.p)} />
            <ResultBar label="Interest earned"    value={fmt(displayInterest)} />
            {compound && (
              <ResultBar
                label="Extra vs simple interest"
                value={fmt(result.difference)}
                note="This is the magic of compounding!"
              />
            )}

            {/* Rule of 72 */}
            {result.ruleOf72 && (
              <View style={ss.rule72}>
                <Text style={ss.rule72Title}>⚡ Rule of 72</Text>
                <Text style={ss.rule72Body}>
                  At {(result.r * 100).toFixed(1)}% interest, your money doubles every{' '}
                  <Text style={{ fontWeight: '800' }}>{result.ruleOf72} years</Text>.
                  {result.t >= result.ruleOf72
                    ? ` In ${result.t} years, that's about ${result.doublings.toFixed(1)} doublings!`
                    : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Year-by-year timeline */}
          {result.timeline.length > 1 && (
            <View style={ss.card}>
              <Text style={ss.cardTitle}>📅 Year-by-Year Growth</Text>
              {result.timeline.map((row) => {
                const pct = Math.min((row.balance / result.compoundFinal) * 100, 100);
                return (
                  <View key={row.year} style={ss.timelineRow}>
                    <Text style={ss.timelineYear}>Yr {row.year}</Text>
                    <View style={ss.timelineBarTrack}>
                      <View
                        style={[ss.timelineBarFill, { width: `${pct}%` as any }]}
                      />
                    </View>
                    <Text style={ss.timelineAmt}>{fmt(row.balance)}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Compound vs simple comparison (only in compound mode) */}
          {compound && (
            <View style={[ss.card, ss.compareCard]}>
              <Text style={ss.compareTitleText}>🔍 Compound vs Simple</Text>
              <View style={ss.compareRow}>
                <View style={ss.compareBox}>
                  <Text style={ss.compareLabel}>Compound</Text>
                  <Text style={[ss.compareAmt, { color: '#27AE60' }]}>{fmt(result.compoundFinal)}</Text>
                </View>
                <View style={ss.compareDiv} />
                <View style={ss.compareBox}>
                  <Text style={ss.compareLabel}>Simple</Text>
                  <Text style={[ss.compareAmt, { color: '#F0A500' }]}>{fmt(result.simpleFinal)}</Text>
                </View>
              </View>
              <Text style={ss.compareNote}>
                Compound earns you an extra {fmt(result.difference)} — that's why banks and investors always want compound growth!
              </Text>
            </View>
          )}
        </>
      )}

      {!result && (
        <View style={ss.emptyCard}>
          <Text style={ss.emptyEmoji}>📈</Text>
          <Text style={ss.emptyTitle}>Enter your numbers above</Text>
          <Text style={ss.emptySub}>See how interest grows your money over time — this is why starting early matters!</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SavingsCalculatorScreen() {
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<Mode>('goal');

  return (
    <SafeAreaView style={ss.safe}>

      {/* Header */}
      <View style={ss.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={ss.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#1B3A6B" />
        </TouchableOpacity>
        <Text style={ss.headerTitle}>Savings Calculator</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Mode tabs */}
      <View style={ss.tabs}>
        <TouchableOpacity
          style={[ss.tab, mode === 'goal' && ss.tabActive]}
          onPress={() => setMode('goal')}
        >
          <Text style={[ss.tabTxt, mode === 'goal' && ss.tabTxtActive]}>🎯  Goal Planner</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ss.tab, mode === 'interest' && ss.tabActive]}
          onPress={() => setMode('interest')}
        >
          <Text style={[ss.tabTxt, mode === 'interest' && ss.tabTxtActive]}>📈  Interest Calc</Text>
        </TouchableOpacity>
      </View>

      {mode === 'goal'     ? <GoalPlanner />  : null}
      {mode === 'interest' ? <InterestCalc /> : null}
    </SafeAreaView>
  );
}

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
  backBtn:     { width: 40, alignItems: 'flex-start' },
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

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1B3A6B', marginBottom: 14 },

  // Fields
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: '#666',
    textTransform: 'uppercase', marginBottom: 6, marginTop: 12,
  },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  inputPrefix: {
    position: 'absolute', left: 12, fontSize: 15,
    color: '#666', fontWeight: '700', zIndex: 1,
  },
  input: {
    borderWidth: 1.5, borderColor: '#DDE2EA', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 15, color: '#222', backgroundColor: '#FAFBFC',
  },

  // Frequency chips
  freqRow:      { flexDirection: 'row', gap: 8, marginTop: 4 },
  freqChip: {
    flex: 1, paddingVertical: 10, borderRadius: 50,
    backgroundColor: '#F0F2F5', alignItems: 'center',
  },
  freqChipActive: { backgroundColor: '#1B3A6B' },
  freqTxt:        { fontSize: 13, fontWeight: '700', color: '#666' },
  freqTxtActive:  { color: '#fff' },

  // Result bars
  resultBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F2F5',
  },
  resultBarHighlight: {
    backgroundColor: '#EEF3FF', borderRadius: 10, paddingHorizontal: 12,
    borderBottomWidth: 0, marginBottom: 8,
  },
  resultLabel:   { fontSize: 14, color: '#555', fontWeight: '600' },
  resultLabelHL: { color: '#1B3A6B', fontWeight: '700' },
  resultNote:    { fontSize: 12, color: '#F0A500', marginTop: 2 },
  resultVal:     { fontSize: 15, fontWeight: '800', color: '#1B3A6B' },
  resultValHL:   { fontSize: 20, color: '#1B3A6B' },

  // Progress arc (actually a bar)
  arcWrap:       { marginBottom: 16 },
  arcBg: {
    height: 12, backgroundColor: '#EAECF0', borderRadius: 6, overflow: 'hidden', marginBottom: 6,
  },
  arcFill:       { height: 12, borderRadius: 6 },
  arcLabelRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  arcPct:        { fontSize: 13, fontWeight: '700', color: '#1B3A6B' },
  arcTarget:     { fontSize: 13, color: '#888' },

  // Tip
  tip: {
    backgroundColor: '#F0FAF4', borderRadius: 10, padding: 12, marginTop: 12,
  },
  tipText: { fontSize: 13, color: '#0D6E48', lineHeight: 19 },

  // Empty state
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 36,
    alignItems: 'center', marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1B3A6B', marginBottom: 6 },
  emptySub:   { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 19 },

  // Rule of 72
  rule72: {
    backgroundColor: '#FFF8E7', borderRadius: 10, padding: 14, marginTop: 12,
  },
  rule72Title: { fontSize: 14, fontWeight: '800', color: '#B8860B', marginBottom: 4 },
  rule72Body:  { fontSize: 13, color: '#7B6000', lineHeight: 19 },

  // Year-by-year timeline
  timelineRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
  },
  timelineYear:     { fontSize: 12, color: '#888', fontWeight: '600', width: 34 },
  timelineBarTrack: { flex: 1, height: 8, backgroundColor: '#EAECF0', borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  timelineBarFill:  { height: 8, backgroundColor: '#1B3A6B', borderRadius: 4 },
  timelineAmt:      { fontSize: 12, fontWeight: '700', color: '#1B3A6B', width: 70, textAlign: 'right' },

  // Compound vs simple card
  compareCard:      { backgroundColor: '#F8F9FC' },
  compareTitleText: { fontSize: 15, fontWeight: '800', color: '#1B3A6B', marginBottom: 14 },
  compareRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  compareBox:       { flex: 1, alignItems: 'center' },
  compareDiv:       { width: 1, height: 40, backgroundColor: '#DDE2EA' },
  compareLabel:     { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 4 },
  compareAmt:       { fontSize: 20, fontWeight: '900' },
  compareNote:      { fontSize: 13, color: '#555', lineHeight: 19 },
});
