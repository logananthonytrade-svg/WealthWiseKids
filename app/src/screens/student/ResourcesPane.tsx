import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StudentStackParamList } from '../../navigation/StudentNavigator';

const W = Dimensions.get('window').width;

interface Tool {
  id:    string;
  emoji: string;
  label: string;
  desc:  string;
  bg:    string;
  soon?: boolean;
  go?:   (nav: StackNavigationProp<StudentStackParamList>) => void;
}

const TOOLS: Tool[] = [
  {
    id: 'spending', emoji: '📊', label: 'Spending Reports', desc: 'See where your money goes',
    bg: '#0D2A5E',
    go: (nav) => nav.navigate('SpendingReports'),
  },
  {
    id: 'analyzer', emoji: '🔍', label: 'Spending Analyzer', desc: '6-month deep dive',
    bg: '#1A2A4E',
    go: (nav) => nav.navigate('SpendingAnalyzer'),
  },
  {
    id: 'progress', emoji: '🏆', label: 'My Progress', desc: 'Lessons & achievements',
    bg: '#0D3D28',
    go: (nav) => nav.navigate('Progress'),
  },
  {
    id: 'profile', emoji: '👤', label: 'My Profile', desc: 'Edit your details',
    bg: '#0D2A5E',
    go: (nav) => nav.navigate('Profile'),
  },
  {
    id: 'budget', emoji: '🧮', label: 'Budget Tracker', desc: 'Track real money & coins',
    bg: '#2A1A5E',
    go: (nav) => nav.navigate('BudgetTracker'),
  },
  {
    id: 'bot', emoji: '🤖', label: 'Trading Bot', desc: 'Auto trading strategies',
    bg: 'rgba(255,255,255,0.05)', soon: true,
  },
  {
    id: 'goals', emoji: '🎯', label: 'Savings Calculator', desc: 'Plan goals & grow money',
    bg: '#0D3D28',
    go: (nav) => nav.navigate('SavingsCalculator'),
  },
  {
    id: 'library', emoji: '📚', label: 'Resource Library', desc: 'Guides & articles',
    bg: 'rgba(255,255,255,0.05)', soon: true,
  },
];

const CARD_W = (W - 62 - 16 * 2 - 10) / 2;

export default function ResourcesPane() {
  const navigation = useNavigation<StackNavigationProp<StudentStackParamList>>();

  return (
    <View style={s.root}>

      {/* ─── Header ─────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Tools &amp; Resources</Text>
          <Text style={s.sub}>Everything you need in one place</Text>
        </View>
        <TouchableOpacity
          style={s.libBtn}
          onPress={() => Alert.alert('Resource Library', 'Coming soon!')}
        >
          <Ionicons name="library-outline" size={18} color="#F0A500" />
        </TouchableOpacity>
      </View>

      {/* ─── Grid ───────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={s.grid}
        showsVerticalScrollIndicator={false}
      >
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={[s.card, { backgroundColor: tool.bg, width: CARD_W }]}
            activeOpacity={0.8}
            onPress={() =>
              tool.soon
                ? Alert.alert(
                    'Coming Soon!',
                    `${tool.label} is in development. Stay tuned!`,
                  )
                : tool.go?.(navigation)
            }
          >
            {tool.soon && (
              <View style={s.soonBadge}>
                <Text style={s.soonTxt}>SOON</Text>
              </View>
            )}
            <Text style={s.cardEmoji}>{tool.emoji}</Text>
            <Text style={s.cardLabel}>{tool.label}</Text>
            <Text style={s.cardDesc}>{tool.desc}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#080F1E' },

  // ── Header ────────────────────────────────────────────────
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  title:  { fontSize: 18, fontWeight: '900', color: '#fff' },
  sub:    { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  libBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(240,165,0,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Grid ──────────────────────────────────────────────────
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: 16, gap: 10,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 18, padding: 16,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 130,
  },
  soonBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  soonTxt:   { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  cardEmoji: { fontSize: 28, marginBottom: 10 },
  cardLabel: { fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 4 },
  cardDesc:  { fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 16 },
});
