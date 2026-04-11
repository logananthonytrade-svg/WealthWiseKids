import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import RichLessonContent, { LessonSection } from './RichLessonContent';

interface Lesson {
  id: string;
  title: string;
  content: string;
  lesson_number: number;
  fun_fact?: string | null;
  sections?: LessonSection[] | null;
}

interface Props {
  lesson: Lesson;
  totalLessons: number;
  onContinue: () => void;
  continueLabel?: string;
}

const SCROLL_THRESHOLD = 60; // px from bottom to consider "read"

export default function LessonCard({ lesson, totalLessons, onContinue, continueLabel = 'Continue' }: Props) {
  const [readyToContinue, setReadyToContinue] = useState(false);
  const scrollViewRef   = useRef<ScrollView>(null);
  const viewHeightRef   = useRef(0);
  const contentHeightRef = useRef(0);

  const checkIfScrollNeeded = () => {
    if (viewHeightRef.current > 0 && contentHeightRef.current > 0) {
      if (contentHeightRef.current <= viewHeightRef.current + SCROLL_THRESHOLD) {
        setReadyToContinue(true);
      }
    }
  };

  const handleLayout = (event: { nativeEvent: { layout: { height: number } } }) => {
    viewHeightRef.current = event.nativeEvent.layout.height;
    checkIfScrollNeeded();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (readyToContinue) return;
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom <= SCROLL_THRESHOLD) {
      setReadyToContinue(true);
    }
  };

  const handleContentSizeChange = (_width: number, contentHeight: number) => {
    contentHeightRef.current = contentHeight;
    checkIfScrollNeeded();
  };

  const hasSections = lesson.sections && lesson.sections.length > 0;

  return (
    <View style={styles.container}>
      {/* Lesson counter */}
      <Text style={styles.counter}>
        Chapter {lesson.lesson_number} of {totalLessons}
      </Text>

      <Text style={styles.title}>{lesson.title}</Text>

      {/* Scrollable content area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
      >
        {hasSections ? (
          <RichLessonContent sections={lesson.sections!} />
        ) : (
          <Text style={styles.body}>{lesson.content}</Text>
        )}

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

        {/* Bottom spacer */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Continue button — sticks at bottom */}
      <View style={styles.btnContainer}>
        {!readyToContinue ? (
          <View style={styles.scrollHint}>
            <Text style={styles.scrollHintText}>↓  Keep reading to continue</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.continueBtn} onPress={onContinue} activeOpacity={0.85}>
            <Text style={styles.continueBtnText}>{continueLabel} →</Text>
          </TouchableOpacity>
        )}
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
    fontSize: 22, fontWeight: '800', color: '#1B3A6B',
    marginHorizontal: 24, marginTop: 8, marginBottom: 16,
    lineHeight: 30,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 4 },
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
  scrollHint: {
    borderRadius: 50, paddingVertical: 16, alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  scrollHintText: {
    color: '#888', fontSize: 14, fontWeight: '600',
  },
  continueBtn: {
    backgroundColor: '#1B3A6B', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
