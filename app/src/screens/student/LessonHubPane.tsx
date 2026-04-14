import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { useSubscription } from '../../hooks/useSubscription';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import { hapticTap } from '../../utils/haptics';

interface School {
  id:           number;
  title:        string;
  description:  string;
  icon_name:    string;
  is_premium:   boolean;
  order_number: number;
}

interface LessonRow {
  id:            string;
  title:         string;
  lesson_number: number;
}

interface ProgRow {
  lesson_id:           string;
  school_id:           number;
  completed:           boolean;
  chapter_quiz_passed: boolean;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function LessonHubPane() {
  const navigation    = useNavigation<StackNavigationProp<StudentStackParamList>>();
  const { selectedChild } = useAuthStore();
  const { isActive }      = useSubscription();

  const [schools,  setSchools]  = useState<School[]>([]);
  const [lessons,  setLessons]  = useState<LessonRow[]>([]);
  const [progress, setProgress] = useState<ProgRow[]>([]);
  const [streak,   setStreak]   = useState(0);
  const [coins,    setCoins]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, [selectedChild?.id]);

  const loadData = async () => {
    if (!selectedChild) { setLoading(false); return; }
    setLoading(true);
    const childId = selectedChild.id;

    const [schoolsRes, progRes, streakRes, coinsRes] = await Promise.all([
      supabase.from('schools').select('*').order('order_number'),
      supabase.from('student_progress')
        .select('lesson_id, school_id, completed, chapter_quiz_passed')
        .eq('child_id', childId),
      supabase.from('streaks').select('current_streak').eq('child_id', childId).maybeSingle(),
      supabase.from('wealth_coins').select('balance').eq('child_id', childId).maybeSingle(),
    ]);

    const schoolList = (schoolsRes.data ?? []) as School[];
    const prog       = (progRes.data ?? []) as ProgRow[];

    setSchools(schoolList);
    setProgress(prog);
    setStreak(streakRes.data?.current_streak ?? 0);
    setCoins(coinsRes.data?.balance ?? 0);

    // Load lessons for School 1 (always the active school for free users)
    const school1 = schoolList[0];
    if (school1) {
      const { data: ls } = await supabase
        .from('lessons')
        .select('id, title, lesson_number')
        .eq('school_id', school1.id)
        .order('lesson_number');
      setLessons((ls ?? []) as LessonRow[]);
    }

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Derived values ──────────────────────────────────────────
  const activeSchool = schools[0] ?? null;

  const school1Progress = () => {
    if (!activeSchool || lessons.length === 0) return { done: 0, total: 0, pct: 0 };
    const doneIds = new Set(
      progress.filter((p) => p.school_id === activeSchool.id && p.completed).map((p) => p.lesson_id)
    );
    const done  = lessons.filter((l) => doneIds.has(l.id)).length;
    const total = lessons.length;
    return { done, total, pct: total > 0 ? (done / total) * 100 : 0 };
  };

  const nextLesson = () => {
    const doneIds = new Set(
      progress.filter((p) => p.completed).map((p) => p.lesson_id)
    );
    return lessons.find((l) => !doneIds.has(l.id)) ?? lessons[0] ?? null;
  };

  const prog = school1Progress();
  const next = nextLesson();

  // ── Sidebar buttons ──────────────────────────────────────────
  const SIDEBAR = [
    { icon: 'trophy-outline'  as const, label: 'Progress', go: () => navigation.navigate('Progress') },
    { icon: 'person-outline'  as const, label: 'Profile',  go: () => navigation.navigate('Profile') },
    { icon: 'wallet-outline'  as const, label: 'Budget',   go: () => navigation.navigate('SpendingReports') },
    { icon: 'settings-outline'as const, label: 'Settings', go: () => navigation.navigate('Upgrade') },
  ];

  return (
    <View style={s.root}>

      {/* ─── Header: greeting + stats ────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{greeting()}</Text>
          <Text style={s.childName}>{selectedChild?.name ?? 'there'} 👋</Text>
        </View>
        <View style={s.headerRight}>
          {streak > 0 && (
            <View style={s.pill}>
              <Text style={s.pillTxt}>🔥 {streak}</Text>
            </View>
          )}
          <View style={[s.pill, s.coinPill]}>
            <Text style={s.pillTxt}>💰 {coins.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* ─── Body: sidebar + scroll area ─────────────────── */}
      <View style={s.body}>

        {/* Left vertical sidebar */}
        <View style={s.sidebar}>
          {SIDEBAR.map((item) => (
            <TouchableOpacity key={item.label} style={s.sideBtn} onPress={() => { hapticTap(); item.go(); }}>
              <Ionicons name={item.icon} size={20} color="rgba(255,255,255,0.65)" />
              <Text style={s.sideLbl}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main content */}
        <ScrollView
          style={s.main}
          contentContainerStyle={s.mainContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F0A500" />}
        >
          {loading ? (
            <View>
              <View style={[s.skeletonCard, { height: 240, marginBottom: 18 }]} />
              <View style={[s.skeletonLine, { width: '38%', marginBottom: 12 }]} />
              <View style={[s.skeletonCard, { height: 82, marginBottom: 10 }]} />
              <View style={[s.skeletonCard, { height: 82, marginBottom: 10 }]} />
            </View>
          ) : (
            <>
              {schools.length === 0 ? (
                <View style={s.emptyCard}>
                  <Text style={s.emptyEmoji}>🏫</Text>
                  <Text style={s.emptyTitle}>No schools yet</Text>
                  <Text style={s.emptyText}>Your learning path is being prepared. Pull down to refresh.</Text>
                </View>
              ) : (
                <>
              {/* ─── Hero school card ───────────────────── */}
              <TouchableOpacity
                style={s.heroCard}
                activeOpacity={0.88}
                onPress={() => {
                  hapticTap();
                  activeSchool &&
                  navigation.navigate('LessonViewer', {
                    schoolId: activeSchool.id,
                    schoolTitle: activeSchool.title,
                  });
                }}
              >
                <LinearGradient
                  colors={['#1B3A6B', '#0D5E3A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.heroGrad}
                >
                  {/* Top row */}
                  <View style={s.heroTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.heroSub}>
                        SCHOOL {activeSchool?.order_number ?? 1}
                      </Text>
                      <Text style={s.heroTitle} numberOfLines={2}>
                        {activeSchool?.title ?? 'School 1'}
                      </Text>
                    </View>
                    <Text style={s.heroEmoji}>{activeSchool?.icon_name ?? '📚'}</Text>
                  </View>

                  {/* Current chapter chip */}
                  {next && (
                    <View style={s.nextRow}>
                      <View style={s.playBtn}>
                        <Ionicons name="play" size={9} color="#0D5E3A" />
                      </View>
                      <Text style={s.nextTxt} numberOfLines={1}>
                        Ch.{next.lesson_number} — {next.title}
                      </Text>
                    </View>
                  )}

                  {/* Progress bar */}
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${prog.pct}%` as any }]} />
                  </View>
                  <View style={s.barFooter}>
                    <Text style={s.barTxt}>{prog.done}/{prog.total} chapters</Text>
                    <Text style={s.barPct}>{Math.round(prog.pct)}%</Text>
                  </View>

                  {/* CTA */}
                  <View style={s.cta}>
                    <Text style={s.ctaTxt}>
                      {prog.done === prog.total && prog.total > 0
                        ? 'View School Results ✓'
                        : 'Continue Learning →'}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* ─── Other schools (locked) ──────────────── */}
              <Text style={s.sectionTitle}>More Schools</Text>

              {schools.slice(1).map((school) => (
                <TouchableOpacity
                  key={school.id}
                  style={[s.lockedCard, isActive && s.lockedCardUnlocked]}
                  activeOpacity={0.85}
                  onPress={() => {
                    hapticTap();
                    isActive
                      ? navigation.navigate('LessonViewer', {
                          schoolId: school.id,
                          schoolTitle: school.title,
                        })
                      : navigation.navigate('Upgrade');
                  }}
                >
                  <Text style={s.lockedEmoji}>{school.icon_name}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.lockedName}>{school.title}</Text>
                    <Text style={s.lockedHint}>
                      {isActive ? 'Premium' : 'Upgrade to unlock ⭐'}
                    </Text>
                  </View>
                  <Ionicons
                    name={isActive ? 'chevron-forward' : 'lock-closed'}
                    size={15}
                    color="rgba(255,255,255,0.3)"
                  />
                </TouchableOpacity>
              ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#080F1E' },

  // ── Header ────────────────────────────────────────────────
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  greeting:    { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  childName:   { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerRight: { flexDirection: 'row', gap: 8 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  coinPill:  { borderWidth: 1, borderColor: 'rgba(240,165,0,0.4)' },
  pillTxt:   { fontSize: 13, fontWeight: '800', color: '#fff' },

  // ── Body layout ───────────────────────────────────────────
  body:    { flex: 1, flexDirection: 'row' },

  // ── Left sidebar ──────────────────────────────────────────
  sidebar: {
    width: 62, alignItems: 'center', paddingTop: 16,
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.06)',
    gap: 2,
  },
  sideBtn: {
    alignItems: 'center', width: '100%',
    paddingVertical: 12, paddingHorizontal: 4,
  },
  sideLbl:  { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 4, textAlign: 'center' },

  // ── Main scroll ───────────────────────────────────────────
  main:        { flex: 1 },
  mainContent: { padding: 14, paddingBottom: 32 },

  // ── Hero card ─────────────────────────────────────────────
  heroCard: { borderRadius: 22, overflow: 'hidden', marginBottom: 20 },
  heroGrad: { padding: 22 },
  heroTop:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  heroSub:  {
    fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  heroTitle: { fontSize: 21, fontWeight: '900', color: '#fff', marginTop: 4 },
  heroEmoji: { fontSize: 50, marginLeft: 10 },

  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  playBtn: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#F0A500',
    justifyContent: 'center', alignItems: 'center',
  },
  nextTxt: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  barTrack: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 50, overflow: 'hidden', marginBottom: 6,
  },
  barFill:   { height: '100%', backgroundColor: '#F0A500', borderRadius: 50 },
  barFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  barTxt:    { fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  barPct:    { fontSize: 11, color: '#F0A500', fontWeight: '700' },

  cta: {
    backgroundColor: 'rgba(240,165,0,0.15)',
    borderRadius: 14, paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(240,165,0,0.35)',
  },
  ctaTxt: { fontSize: 14, fontWeight: '800', color: '#F0A500' },

  // ── Locked school rows ────────────────────────────────────
  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 10,
  },
  lockedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  lockedCardUnlocked: { borderColor: 'rgba(27,174,96,0.25)' },
  lockedEmoji: { fontSize: 26 },
  lockedName:  { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
  lockedHint:  { fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 },
  skeletonCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonLine: {
    height: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 20,
  },
  emptyEmoji: { fontSize: 38, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 8 },
  emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20 },
});
