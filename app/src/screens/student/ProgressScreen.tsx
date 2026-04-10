import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Modal,
} from 'react-native';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import LessonProgressBar from '../../components/lessons/LessonProgressBar';

interface Badge {
  id: string;
  name: string;
  icon_name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic';
}

interface StatsData {
  lessonsCompleted: number;
  quizzesPassed: number;
  currentStreak: number;
  longestStreak: number;
  totalCoins: number;
}

const RARITY_COLOR: Record<string, string> = {
  common: '#27AE60',
  rare:   '#1B3A6B',
  epic:   '#9B27AF',
};

export default function ProgressScreen() {
  const selectedChild = useAuthStore((s) => s.selectedChild);
  const [stats, setStats]             = useState<StatsData | null>(null);
  const [allBadges, setAllBadges]     = useState<Badge[]>([]);
  const [earnedIds, setEarnedIds]     = useState<Set<string>>(new Set());
  const [schoolProgress, setSchoolProg] = useState<Record<number, { done: number; total: number }>>({});
  const [schools, setSchools]         = useState<any[]>([]);
  const [selectedBadge, setSelected]  = useState<Badge | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (!selectedChild) return;
    const childId = selectedChild.id;

    const [streakRes, coinsRes, progressRes, attemptsRes, badgesRes, earnedRes, schoolsRes] = await Promise.all([
      supabase.from('streaks').select('current_streak, longest_streak').eq('child_id', childId).maybeSingle(),
      supabase.from('wealth_coins').select('balance').eq('child_id', childId).maybeSingle(),
      supabase.from('student_progress').select('school_id, completed').eq('child_id', childId),
      supabase.from('quiz_attempts').select('passed').eq('child_id', childId),
      supabase.from('badges').select('*'),
      supabase.from('student_badges').select('badge_id').eq('child_id', childId),
      supabase.from('schools').select('id, title, icon_name').order('order_number'),
    ]);

    const prog       = progressRes.data ?? [];
    const attempts   = attemptsRes.data ?? [];
    const allBadgeList = badgesRes.data ?? [];
    const earned     = earnedRes.data ?? [];

    // Stats
    setStats({
      lessonsCompleted: prog.filter((p) => p.completed).length,
      quizzesPassed:    attempts.filter((a) => a.passed).length,
      currentStreak:    streakRes.data?.current_streak ?? 0,
      longestStreak:    streakRes.data?.longest_streak ?? 0,
      totalCoins:       coinsRes.data?.balance ?? 0,
    });

    setAllBadges(allBadgeList);
    setEarnedIds(new Set(earned.map((e) => e.badge_id)));

    // School progress
    const schoolList = schoolsRes.data ?? [];
    setSchools(schoolList);

    const totalBySchool: Record<number, number> = {};
    const doneBySchool: Record<number, number>  = {};
    for (const l of prog) {
      totalBySchool[l.school_id] = (totalBySchool[l.school_id] ?? 0) + 1;
      if (l.completed) doneBySchool[l.school_id] = (doneBySchool[l.school_id] ?? 0) + 1;
    }

    // Fetch total lessons per school
    const counts = await Promise.all(
      schoolList.map((s: any) =>
        supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('school_id', s.id)
      )
    );

    const sp: Record<number, { done: number; total: number }> = {};
    schoolList.forEach((s: any, i: number) => {
      sp[s.id] = { done: doneBySchool[s.id] ?? 0, total: counts[i].count ?? 0 };
    });
    setSchoolProg(sp);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>My Progress</Text>

        {/* Stats grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <StatCard icon="📚" value={stats.lessonsCompleted} label="Lessons" />
            <StatCard icon="🎯" value={stats.quizzesPassed} label="Quizzes Passed" />
            <StatCard icon="🔥" value={stats.currentStreak} label="Day Streak" />
            <StatCard icon="🏆" value={stats.longestStreak} label="Best Streak" />
            <StatCard icon="💰" value={stats.totalCoins} label="WealthCoins" />
          </View>
        )}

        {/* School progress */}
        <Text style={styles.sectionTitle}>Schools</Text>
        {schools.map((s) => {
          const p = schoolProgress[s.id] ?? { done: 0, total: 0 };
          return (
            <View key={s.id} style={styles.schoolRow}>
              <Text style={styles.schoolIcon}>{s.icon_name}</Text>
              <View style={styles.schoolBody}>
                <Text style={styles.schoolName}>{s.title}</Text>
                {p.total > 0
                  ? <LessonProgressBar completed={p.done} total={p.total} />
                  : <Text style={styles.schoolLocked}>Locked</Text>
                }
              </View>
            </View>
          );
        })}

        {/* Badge collection */}
        <Text style={styles.sectionTitle}>Trophy Case</Text>
        <View style={styles.badgeGrid}>
          {allBadges.map((b) => {
            const earned = earnedIds.has(b.id);
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.badgeCard, !earned && styles.badgeLocked]}
                onPress={() => setSelected(b)}
                activeOpacity={0.8}
              >
                <Text style={[styles.badgeEmoji, !earned && { opacity: 0.25 }]}>{b.icon_name}</Text>
                <Text style={[styles.badgeName, !earned && styles.textMuted]} numberOfLines={2}>
                  {b.name}
                </Text>
                {earned && (
                  <View style={[styles.rarityDot, { backgroundColor: RARITY_COLOR[b.rarity] }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Badge detail modal */}
      <Modal visible={!!selectedBadge} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} onPress={() => setSelected(null)}>
          <View style={styles.modal}>
            <Text style={styles.modalEmoji}>{selectedBadge?.icon_name}</Text>
            <Text style={styles.modalName}>{selectedBadge?.name}</Text>
            <View style={[styles.rarityPill, { backgroundColor: RARITY_COLOR[selectedBadge?.rarity ?? 'common'] }]}>
              <Text style={styles.rarityText}>{selectedBadge?.rarity?.toUpperCase()}</Text>
            </View>
            <Text style={styles.modalDesc}>{selectedBadge?.description}</Text>
            {selectedBadge && !earnedIds.has(selectedBadge.id) && (
              <Text style={styles.howToEarn}>Keep learning to unlock this badge!</Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  content:   { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1B3A6B', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  statCard:  {
    width: '30%', backgroundColor: '#fff', borderRadius: 14,
    padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIcon:  { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '900', color: '#1B3A6B' },
  statLabel: { fontSize: 11, color: '#888', textAlign: 'center', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1B3A6B', marginBottom: 12 },
  schoolRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
  },
  schoolIcon: { fontSize: 28 },
  schoolBody: { flex: 1 },
  schoolName: { fontSize: 14, fontWeight: '700', color: '#1B3A6B', marginBottom: 6 },
  schoolLocked: { fontSize: 12, color: '#aaa' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: {
    width: '30%', backgroundColor: '#fff', borderRadius: 14, padding: 12,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  badgeLocked: { backgroundColor: '#F5F5F5' },
  badgeEmoji: { fontSize: 28, marginBottom: 6 },
  badgeName: { fontSize: 11, fontWeight: '700', color: '#333', textAlign: 'center' },
  textMuted: { color: '#bbb' },
  rarityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: {
    backgroundColor: '#fff', borderRadius: 20, padding: 28,
    alignItems: 'center', marginHorizontal: 32, width: '80%',
  },
  modalEmoji: { fontSize: 56, marginBottom: 12 },
  modalName: { fontSize: 20, fontWeight: '800', color: '#1B3A6B', marginBottom: 8 },
  rarityPill: { borderRadius: 50, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  rarityText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  modalDesc: { fontSize: 14, color: '#444', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  howToEarn: { fontSize: 13, color: '#888', fontStyle: 'italic', textAlign: 'center' },
});
