import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import LessonCard from '../../components/lessons/LessonCard';
import LessonProgressBar from '../../components/lessons/LessonProgressBar';
import BadgeAwardModal from '../../components/BadgeAwardModal';
import { BadgeRecord } from '../../utils/badgeUtils';
import { LessonSection } from '../../components/lessons/RichLessonContent';

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
  sections?: LessonSection[] | null;
}

export default function LessonViewerScreen({ navigation, route }: Props) {
  const { schoolId, schoolTitle } = route.params;
  const selectedChild = useAuthStore((s) => s.selectedChild);

  const [lessons, setLessons]           = useState<Lesson[]>([]);
  const [completedIds, setCompleted]    = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [newBadges, setNewBadges]       = useState<BadgeRecord[]>([]);

  // Slide animation
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Reload whenever we regain focus (returns from ChapterQuiz)
  useFocusEffect(
    useCallback(() => {
      loadLessons();
    }, [schoolId])
  );

  const loadLessons = async () => {
    const [lessonsRes, progressRes] = await Promise.all([
      supabase
        .from('lessons')
        .select('*')
        .eq('school_id', schoolId)
        .order('lesson_number', { ascending: true }),
      supabase
        .from('student_progress')
        .select('lesson_id, completed, chapter_quiz_passed')
        .eq('child_id', selectedChild!.id)
        .eq('school_id', schoolId),
    ]);

    const lessonData = lessonsRes.data ?? [];
    const progress   = progressRes.data ?? [];

    // A lesson is "fully done" when it's completed AND chapter quiz passed
    // (legacy: completed=true with no chapter_quiz_passed col → treat as done)
    const completedSet = new Set(
      progress
        .filter((p) => p.completed && (p.chapter_quiz_passed !== false))
        .map((p) => p.lesson_id)
    );

    // Resume from the first chapter not yet done
    const firstIncomplete = lessonData.findIndex((l) => !completedSet.has(l.id));
    const startIndex = firstIncomplete >= 0 ? firstIncomplete : 0;

    setLessons(lessonData);
    setCompleted(completedSet);
    setCurrentIndex(startIndex);
    setLoading(false);
  };

  // Called when user finishes reading the chapter (scroll gate satisfied)
  // Navigate to the chapter quiz — completion is recorded there on pass
  const handleContinue = () => {
    if (lessons.length === 0) return;
    const lesson       = lessons[currentIndex];
    const isLastLesson = currentIndex === lessons.length - 1;

    navigation.navigate('ChapterQuiz', {
      schoolId,
      schoolTitle,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonNumber: lesson.lesson_number,
      totalLessons: lessons.length,
      isLastLesson,
    });
  };

  if (loading || lessons.length === 0) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.loadingText}>Loading chapters…</Text>
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
          continueLabel="Take Chapter Quiz →"
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
