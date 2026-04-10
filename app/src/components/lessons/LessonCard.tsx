import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';

interface Lesson {
  id: string;
  title: string;
  content: string;
  lesson_number: number;
  fun_fact?: string | null;
}

interface Props {
  lesson: Lesson;
  totalLessons: number;
  onContinue: () => void;
  continueLabel?: string;
}

export default function LessonCard({ lesson, totalLessons, onContinue, continueLabel = 'Continue' }: Props) {
  return (
    <View style={styles.container}>
      {/* Lesson counter */}
      <Text style={styles.counter}>
        Lesson {lesson.lesson_number} of {totalLessons}
      </Text>

      <Text style={styles.title}>{lesson.title}</Text>

      {/* Scrollable content area */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.body}>{lesson.content}</Text>

        {/* Fun Fact callout */}
        {lesson.fun_fact ? (
          <View style={styles.funFact}>
            <Text style={styles.funFactIcon}>💡</Text>
            <View style={styles.funFactBody}>
              <Text style={styles.funFactLabel}>Did You Know?</Text>
              <Text style={styles.funFactText}>{lesson.fun_fact}</Text>
            </View>
          </View>
        ) : null}

        {/* Bottom spacer so content is not hidden under button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Continue button — rendered outside ScrollView so it sticks at bottom */}
      <View style={styles.btnContainer}>
        <TouchableOpacity style={styles.continueBtn} onPress={onContinue} activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>{continueLabel} →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  counter: {
    fontSize: 12, fontWeight: '700', color: '#27AE60',
    textTransform: 'uppercase', letterSpacing: 1,
    marginHorizontal: 24, marginTop: 16,
  },
  title: {
    fontSize: 24, fontWeight: '800', color: '#1B3A6B',
    marginHorizontal: 24, marginTop: 8, marginBottom: 16,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  body: { fontSize: 17, color: '#222', lineHeight: 28 },
  funFact: {
    flexDirection: 'row', gap: 12, marginTop: 28,
    backgroundColor: '#FFFBF0',
    borderLeftWidth: 4, borderLeftColor: '#F0A500',
    borderRadius: 12, padding: 16,
  },
  funFactIcon: { fontSize: 22, marginTop: 2 },
  funFactBody: { flex: 1 },
  funFactLabel: { fontSize: 12, fontWeight: '700', color: '#F0A500', textTransform: 'uppercase', marginBottom: 4 },
  funFactText: { fontSize: 14, color: '#444', lineHeight: 22 },
  btnContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: 36, paddingTop: 16,
    backgroundColor: '#fff',
  },
  continueBtn: {
    backgroundColor: '#1B3A6B', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
