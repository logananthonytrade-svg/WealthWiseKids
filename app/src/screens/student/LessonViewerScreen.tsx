import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import LessonCard from '../../components/lessons/LessonCard';
import LessonProgressBar from '../../components/lessons/LessonProgressBar';
import { updateStreak } from '../../utils/streakUtils';
import { awardCoins, checkAndAwardBadges } from '../../utils/badgeUtils';
import BadgeAwardModal from '../../components/BadgeAwardModal';
import { BadgeRecord } from '../../utils/badgeUtils';

type Props = {
  navigation: StackNavigationProp<StudentStackParamList, 'LessonViewer'>;
  route: RouteProp<StudentStackParamList, 'LessonViewer'>;
};

interface Lesson {
  id: string;
  school_id: number;
  title: string;
  content: string;
  lesson_number: number;
  lesson_type: string;
  fun_fact: string | null;
}

export default function LessonViewerScreen({ navigation, route }: Props) {
  const { schoolId, schoolTitle } = route.params;
  const selectedChild = useAuthStore((s) => s.selectedChild);

  const [lessons, setLessons]             = useState<Lesson[]>([]);
  const [completedIds, setCompleted]      = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [loading, setLoading]             = useState(true);
  const [newBadges, setNewBadges]         = useState<BadgeRecord[]>([]);

  // Slide animation
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    const [lessonsRes, progressRes] = await Promise.all([
      supabase
        .from('lessons')
        .select('*')
        .eq('school_id', schoolId)
        .order('lesson_number', { ascending: true }),
      supabase
        .from('student_progress')
        .select('lesson_id, completed')
        .eq('child_id', selectedChild!.id)
        .eq('school_id', schoolId),
    ]);

    const lessonData = lessonsRes.data ?? [];
    const progress   = progressRes.data ?? [];

    const completedSet = new Set(
      progress.filter((p) => p.completed).map((p) => p.lesson_id)
    );

    // Resume from the first incomplete lesson
    const firstIncomplete = lessonData.findIndex((l) => !completedSet.has(l.id));
    const startIndex = firstIncomplete >= 0 ? firstIncomplete : 0;

    setLessons(lessonData);
    setCompleted(completedSet);
    setCurrentIndex(startIndex);
    setLoading(false);
  };

  const handleContinue = async () => {
    if (!selectedChild || lessons.length === 0) return;

    const lesson        = lessons[currentIndex];
    const childId       = selectedChild.id;

    // 1. Mark lesson as complete in student_progress
    await supabase.from('student_progress').upsert({
      child_id: childId,
      school_id: schoolId,
      lesson_id: lesson.id,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'child_id,lesson_id' });

    const newCompleted = new Set(completedIds).add(lesson.id);
    setCompleted(newCompleted);

    // 2. Award 10 WealthCoins
    await awardCoins(childId, 10, `Completed lesson: ${lesson.title}`);

    // 3. Update streak
    await updateStreak(childId);

    // 4. Check badges
    const badges: BadgeRecord[] = [];

    // First-ever lesson
    if (completedIds.size === 0) {
      const b = await checkAndAwardBadges(childId, 'lesson_complete', '1');
      badges.push(...b);
    }

    // Check "lessons in a day"
    const todayStr = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('student_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('completed', true)
      .gte('completed_at', `${todayStr}T00:00:00`);

    if ((count ?? 0) >= 3) {
      const b = await checkAndAwardBadges(childId, 'lessons_in_day', '3');
      badges.push(...b);
    }

    if (badges.length > 0) setNewBadges(badges);

    // 5. Navigate to next lesson or quiz intro
    const isLastLesson = currentIndex === lessons.length - 1;

    if (isLastLesson) {
      navigation.navigate('QuizIntro', {
        schoolId,
        schoolTitle,
        lessonCount: lessons.length,
      });
      return;
    }

    // Animate slide: current slides left, next slides in from right
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -400, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 400, duration: 0, useNativeDriver: true }),
    ]).start(() => {
      setCurrentIndex((i) => i + 1);
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    });
  };

  if (loading || lessons.length === 0) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.loadingText}>Loading lessons…</Text>
      </SafeAreaView>
    );
  }

  const completedCount = lessons.filter((l) => completedIds.has(l.id)).length;
  const currentLesson  = lessons[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.schoolTitle}>{schoolTitle}</Text>
        <LessonProgressBar completed={completedCount} total={lessons.length} />
      </View>

      {/* Animated lesson card */}
      <Animated.View style={[styles.cardWrapper, { transform: [{ translateX: slideAnim }] }]}>
        <LessonCard
          lesson={currentLesson}
          totalLessons={lessons.length}
          onContinue={handleContinue}
          continueLabel={currentIndex === lessons.length - 1 ? 'Finish & Take Quiz' : 'Continue'}
        />
      </Animated.View>

      {/* Badge award modal */}
      <BadgeAwardModal
        badges={newBadges}
        onDismiss={() => setNewBadges([])}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  schoolTitle: { fontSize: 13, color: '#666', fontWeight: '600', marginBottom: 8 },
  cardWrapper: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { color: '#888' },
});
