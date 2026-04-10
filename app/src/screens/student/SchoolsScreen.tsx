import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import supabase from '../../lib/supabase';
import useAuthStore, { type AuthState } from '../../store/authStore';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import LessonProgressBar from '../../components/lessons/LessonProgressBar';

const AVATARS = ['🦁', '🐯', '🦊', '🐼', '🐨', '🦋', '🐬', '🦅', '🦉', '🐉'];

interface School {
  id: number;
  title: string;
  description: string;
  icon_name: string;
  is_premium: boolean;
  order_number: number;
}

interface SchoolProgress {
  completed: number;
  total: number;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function SchoolsScreen() {
  const navigation = useNavigation<StackNavigationProp<StudentStackParamList>>();
  const selectedChild = useAuthStore((s: AuthState) => s.selectedChild);
  const [schools, setSchools]           = useState<School[]>([]);
  const [streak, setStreak]             = useState(0);
  const [coins, setCoins]               = useState(0);
  const [progress, setProgress]         = useState<Record<number, SchoolProgress>>({});
  const [completedSchools, setComplete] = useState<Set<number>>(new Set());
  const [subscription, setSub]          = useState<'free' | 'premium' | 'family'>('free');
  const [loading, setLoading]           = useState(true);
  const [lockedModal, setLockedModal]   = useState<School | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (!selectedChild) return;
    const childId = selectedChild.id;

    const [schoolsRes, streakRes, coinsRes, progressRes, subRes] = await Promise.all([
      supabase.from('schools').select('*').order('order_number'),
      supabase.from('streaks').select('current_streak').eq('child_id', childId).maybeSingle(),
      supabase.from('wealth_coins').select('balance').eq('child_id', childId).maybeSingle(),
      supabase.from('student_progress').select('school_id, completed').eq('child_id', childId),
      supabase.from('subscriptions').select('plan_type, status, current_period_end')
        .eq('user_id', useAuthStore.getState().user!.id).maybeSingle(),
    ]);

    const schoolList = (schoolsRes.data ?? []) as School[];
    const prog       = progressRes.data ?? [];

    // Calculate progress per school
    const totalBySchool: Record<number, number> = {};
    const doneBySchool: Record<number, number>  = {};
    for (const l of prog) {
      totalBySchool[l.school_id] = (totalBySchool[l.school_id] ?? 0) + 1;
      if (l.completed) doneBySchool[l.school_id] = (doneBySchool[l.school_id] ?? 0) + 1;
    }

    // For each school, pre-calculate total lessons
    const lessonCounts = await Promise.all(
      schoolList.map((s) =>
        supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('school_id', s.id)
      )
    );

    const progressMap: Record<number, SchoolProgress> = {};
    const completedSet = new Set<number>();

    schoolList.forEach((s, i) => {
      const total = lessonCounts[i].count ?? 0;
      const done  = doneBySchool[s.id] ?? 0;
      progressMap[s.id] = { completed: done, total };
      if (total > 0 && done === total) completedSet.add(s.id);
    });

    const subData = subRes.data;
    const plan    = subData?.plan_type ?? 'free';
    const isActive = subData?.status === 'active' &&
      (!subData?.current_period_end || new Date(subData.current_period_end) > new Date());

    setSchools(schoolList);
    setStreak(streakRes.data?.current_streak ?? 0);
    setCoins(coinsRes.data?.balance ?? 0);
    setProgress(progressMap);
    setComplete(completedSet);
    setSub(isActive ? plan : 'free');
    setLoading(false);
  };

  const handleSchoolPress = (school: School) => {
    // Check prerequisites: must complete previous school first
    if (school.order_number > 1) {
      const prevSchool = schools.find((s: School) => s.order_number === school.order_number - 1);
      if (prevSchool && !completedSchools.has(prevSchool.id)) {
        setLockedModal({ ...school, description: `Complete "${prevSchool.title}" first.` });
        return;
      }
    }

    // Premium lock
    if (school.is_premium && subscription === 'free') {
      navigation.navigate('Upgrade');
      return;
    }

    navigation.navigate('LessonViewer', { schoolId: school.id, schoolTitle: school.title });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color="#1B3A6B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{selectedChild?.name ?? 'there'} 👋</Text>
        </View>
        <View style={styles.stats}>
          {streak > 0 && <View style={styles.statPill}><Text style={styles.statText}>🔥 {streak}</Text></View>}
          <View style={styles.statPill}><Text style={styles.statText}>💰 {coins}</Text></View>
        </View>
      </View>

      <FlatList<School>
        data={schools}
        keyExtractor={(s: School) => String(s.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item: school }: { item: School }) => {
          const prog      = progress[school.id] ?? { completed: 0, total: 0 };
          const done      = completedSchools.has(school.id);
          const locked    = school.is_premium && subscription === 'free';
          const prereqMet = school.order_number === 1 ||
            completedSchools.has(schools.find((s: School) => s.order_number === school.order_number - 1)?.id ?? -1);
          const isLocked  = locked || !prereqMet;

          return (
            <TouchableOpacity
              style={[styles.card, isLocked && styles.cardLocked]}
              onPress={() => handleSchoolPress(school)}
              activeOpacity={0.8}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardIcon}>{school.icon_name}</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, isLocked && styles.textMuted]}>
                    {school.title}
                  </Text>
                  {done && <Text style={styles.doneBadge}>✅</Text>}
                  {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
                </View>
                <Text style={[styles.cardDesc, isLocked && styles.textMuted]} numberOfLines={2}>
                  {school.description}
                </Text>
                {!isLocked && prog.total > 0 && (
                  <View style={styles.progressWrap}>
                    <LessonProgressBar completed={prog.completed} total={prog.total} />
                  </View>
                )}
                {locked && (
                  <Text style={styles.premiumLabel}>Premium ⭐</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Locked pre-req modal */}
      <Modal visible={!!lockedModal} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} onPress={() => setLockedModal(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>🔒</Text>
            <Text style={styles.modalTitle}>Not yet!</Text>
            <Text style={styles.modalDesc}>{lockedModal?.description}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setLockedModal(null)}>
              <Text style={styles.modalBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F8F9FC' },
  loading:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  greeting:    { fontSize: 13, color: '#888' },
  name:        { fontSize: 20, fontWeight: '800', color: '#1B3A6B' },
  stats:       { flexDirection: 'row', gap: 8 },
  statPill:    { backgroundColor: '#F0F4FF', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  statText:    { fontSize: 14, fontWeight: '700', color: '#1B3A6B' },
  list:        { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    padding: 16, gap: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLocked:  { opacity: 0.6 },
  cardLeft:    { justifyContent: 'center' },
  cardIcon:    { fontSize: 36 },
  cardBody:    { flex: 1 },
  cardTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardTitle:   { fontSize: 16, fontWeight: '800', color: '#1B3A6B', flex: 1 },
  doneBadge:   { fontSize: 16 },
  lockIcon:    { fontSize: 14 },
  cardDesc:    { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 8 },
  textMuted:   { color: '#aaa' },
  progressWrap:{ marginTop: 4 },
  premiumLabel:{ fontSize: 12, color: '#F0A500', fontWeight: '700' },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard:   { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', marginHorizontal: 32 },
  modalIcon:   { fontSize: 42, marginBottom: 12 },
  modalTitle:  { fontSize: 20, fontWeight: '800', color: '#1B3A6B', marginBottom: 8 },
  modalDesc:   { fontSize: 14, color: '#444', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalBtn:    { backgroundColor: '#1B3A6B', borderRadius: 50, paddingVertical: 12, paddingHorizontal: 32 },
  modalBtnText:{ color: '#fff', fontWeight: '700' },
});
