import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Animated, ScrollView, ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { checkAndAwardBadges, checkAndAwardLessonBadges, checkAndAwardStreakBadges, checkAndAwardPerfectCountBadges } from '../../utils/badgeUtils';
import { updateStreak } from '../../utils/streakUtils';
import BadgeAwardModal from '../../components/BadgeAwardModal';
import { BadgeRecord } from '../../utils/badgeUtils';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

type Props = {
  navigation: StackNavigationProp<StudentStackParamList, 'ChapterQuiz'>;
  route: RouteProp<StudentStackParamList, 'ChapterQuiz'>;
};

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface SchoolProgress {
  coins_awarded:     number;
  best_coins_earned: number;
  best_total_points: number;
  best_percentage:   number;
  coin_tier:         number;
  quizzes_recorded:  number;
  total_quizzes:     number;
}

type Phase = 'quiz' | 'result';

const PASS_THRESHOLD = 0.7;

export default function ChapterQuizScreen({ navigation, route }: Props) {
  const { schoolId, schoolTitle, lessonId, lessonTitle, lessonNumber, totalLessons, isLastLesson } = route.params;
  const selectedChild = useAuthStore((s) => s.selectedChild);

  const [questions, setQuestions]         = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx]       = useState(0);
  const [selectedAnswer, setSelected]     = useState<string | null>(null);
  const [revealed, setRevealed]           = useState(false);
  const [correctCount, setCorrect]        = useState(0);
  const [phase, setPhase]                 = useState<Phase>('quiz');
  const [score, setScore]                 = useState(0);
  const [passed, setPassed]               = useState(false);
  const [loading, setLoading]             = useState(true);
  const [newBadges, setNewBadges]         = useState<BadgeRecord[]>([]);
  const [schoolProgress, setSchoolProgress] = useState<SchoolProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  const correctAnim = useRef(new Animated.Value(0)).current;
  const resultAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadQuestions(); }, []);

  const loadQuestions = async () => {
    const { data } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_number', { ascending: true });
    setQuestions(data ?? []);
    setLoading(false);
  };

  const handleSelect = (answer: string) => {
    if (revealed) return;
    setSelected(answer);
    setRevealed(true);

    const q = questions[currentIdx];
    const wasCorrect = answer === q.correct_answer;
    const newCorrect = wasCorrect ? correctCount + 1 : correctCount;

    if (wasCorrect) {
      setCorrect(newCorrect);
      correctAnim.setValue(0);
      Animated.sequence([
        Animated.timing(correctAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.delay(500),
        Animated.timing(correctAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }

    const delay = wasCorrect ? 900 : 2200;
    setTimeout(() => advanceQuestion(newCorrect), delay);
  };

  const advanceQuestion = (currentCorrect: number) => {
    const nextIdx = currentIdx + 1;
    if (nextIdx < questions.length) {
      setCurrentIdx(nextIdx);
      setSelected(null);
      setRevealed(false);
      return;
    }

    // Quiz complete â€” show result immediately, load progress in background
    const finalScore = Math.round((currentCorrect / questions.length) * 100);
    const didPass    = currentCorrect / questions.length >= PASS_THRESHOLD;
    setScore(finalScore);
    setPassed(didPass);
    setPhase('result');
    Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true, tension: 50 }).start();

    // Always record score to backend (pass OR fail â€” best score stored)
    recordChapterScore(finalScore);

    // Only mark lesson complete on pass
    if (didPass) handlePass(finalScore);
  };

  // â”€â”€ Record score to backend (both pass and fail) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const recordChapterScore = async (percentScore: number) => {
    if (!selectedChild) return;
    setProgressLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${API_URL}/schools/award-coins`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          child_id:      selectedChild.id,
          school_id:     schoolId,
          lesson_id:     lessonId,
          percent_score: percentScore,
        }),
      });

      if (res.ok) {
        const data: SchoolProgress = await res.json();
        setSchoolProgress(data);
      }
    } catch (err) {
      console.error('recordChapterScore error:', err);
    } finally {
      setProgressLoading(false);
    }
  };

  // â”€â”€ Mark lesson complete in student_progress (pass only) â”€â”€â”€â”€â”€
  const handlePass = async (finalScore: number) => {
    if (!selectedChild) return;
    const childId = selectedChild.id;

    await supabase.from('student_progress').upsert({
      child_id:               childId,
      school_id:              schoolId,
      lesson_id:              lessonId,
      completed:              true,
      completed_at:           new Date().toISOString(),
      chapter_quiz_passed:    true,
      chapter_quiz_passed_at: new Date().toISOString(),
    }, { onConflict: 'child_id,lesson_id' });

    await updateStreak(childId);

    const badges: BadgeRecord[] = [];

    const { count: completedCount } = await supabase
      .from('student_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('completed', true);

    if ((completedCount ?? 0) === 1) {
      const b = await checkAndAwardBadges(childId, 'lesson_complete', '1');
      badges.push(...b);
    }
    if (finalScore === 100) {
      const b = await checkAndAwardBadges(childId, 'quiz_perfect');
      badges.push(...b);
    }
    if (badges.length > 0) setNewBadges(badges);
  };

  const handleContinue = () => {
    if (isLastLesson) {
      navigation.replace('QuizIntro', { schoolId, schoolTitle, lessonCount: totalLessons });
    } else {
      navigation.goBack();
    }
  };

  const handleRetry = () => {
    setCurrentIdx(0);
    setSelected(null);
    setRevealed(false);
    setCorrect(0);
    setPhase('quiz');
    setSchoolProgress(null);
    resultAnim.setValue(0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.loadingText}>Loading quizâ€¦</Text>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    handlePass(100);
    handleContinue();
    return null;
  }

  // â”€â”€â”€ Result screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (phase === 'result') {
    const sp = schoolProgress;

    return (
      <SafeAreaView style={[styles.container, passed ? styles.bgPass : styles.bgFail]}>
        <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>

          {/* Score circle */}
          <Animated.View style={[styles.scoreCircle, { transform: [{ scale: resultAnim }] }]}>
            <Text style={styles.scoreNum}>{score}%</Text>
            <Text style={styles.scoreLabel}>{passed ? 'âœ… Passed!' : 'âŒ Try again'}</Text>
          </Animated.View>

          <Text style={styles.resultHeading}>
            {passed ? `Chapter ${lessonNumber} Complete!` : 'Almost there!'}
          </Text>
          <Text style={styles.resultSub}>
            {correctCount} of {questions.length} correct
            {passed ? '' : ` â€” need ${Math.ceil(questions.length * PASS_THRESHOLD)} to pass`}
          </Text>

          {/* School coin progress card */}
          <View style={styles.progressCard}>
            <Text style={styles.progressCardTitle}>ðŸ“Š School Coin Progress</Text>

            {progressLoading || !sp ? (
              <ActivityIndicator color="#F0A500" style={{ marginVertical: 12 }} />
            ) : (
              <>
                {/* Points bar */}
                <View style={styles.barRow}>
                  <Text style={styles.barLabel}>
                    {sp.best_total_points} / {sp.total_quizzes * 50} pts
                  </Text>
                  <Text style={styles.barPct}>{sp.best_percentage.toFixed(1)}%</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.min(sp.best_percentage, 100)}%` as any }]} />
                </View>

                {/* Quizzes done */}
                <Text style={styles.quizzesText}>
                  {sp.quizzes_recorded} of {sp.total_quizzes} chapters recorded
                </Text>

                {/* Coins */}
                <View style={styles.coinRow}>
                  <View style={styles.coinBlock}>
                    <Text style={styles.coinBig}>
                      {sp.coins_awarded > 0 ? `+${sp.coins_awarded}` : 'â€”'}
                    </Text>
                    <Text style={styles.coinSub}>just earned</Text>
                  </View>
                  <View style={styles.coinDivider} />
                  <View style={styles.coinBlock}>
                    <Text style={styles.coinBig}>{sp.best_coins_earned} / 150</Text>
                    <Text style={styles.coinSub}>school total ðŸ’°</Text>
                  </View>
                </View>

                {sp.coins_awarded === 0 && (
                  <Text style={styles.noNewCoins}>
                    Same tier â€” improve your score to earn more coins
                  </Text>
                )}

                {/* Next tier hint */}
                {sp.best_coins_earned < 150 && (
                  <Text style={styles.nextTier}>
                    Next tier: {nextTierCoins(sp.best_percentage)} coins at {nextTierPct(sp.best_percentage)}%+
                  </Text>
                )}
              </>
            )}
          </View>

          {/* CTA buttons */}
          {passed ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>
                {isLastLesson ? 'Take the Final School Quiz ðŸŽ“' : 'Next Chapter â†’'}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.85}>
                <Text style={styles.retryBtnText}>Retry Chapter Quiz ðŸ”„</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reviewBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.reviewBtnText}>Review the Chapter</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <BadgeAwardModal badges={newBadges} onDismiss={() => setNewBadges([])} />
      </SafeAreaView>
    );
  }

  // â”€â”€â”€ Quiz screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const q = questions[currentIdx];
  const correctOpacity   = correctAnim;
  const correctTranslate = correctAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -36] });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.exitBtn}>âœ•</Text>
        </TouchableOpacity>
        <View style={styles.headerMeta}>
          <Text style={styles.chapterLabel}>Chapter {lessonNumber} Quiz</Text>
          <Text style={styles.progress}>Question {currentIdx + 1} of {questions.length}</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${((currentIdx + 1) / questions.length) * 100}%` as any }]} />
        </View>
      </View>

      {/* Question */}
      <ScrollView contentContainerStyle={styles.quizContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.questionText}>{q.question_text}</Text>

        {q.options.map((option: string) => {
          let optStyle   = styles.option;
          let textStyle  = styles.optionText;
          if (revealed) {
            if (option === q.correct_answer) {
              optStyle  = { ...styles.option,     ...styles.optionCorrect };
              textStyle = { ...styles.optionText,  ...styles.optionTextCorrect };
            } else if (option === selectedAnswer) {
              optStyle  = { ...styles.option,     ...styles.optionWrong };
              textStyle = { ...styles.optionText,  ...styles.optionTextWrong };
            }
          } else if (option === selectedAnswer) {
            optStyle = { ...styles.option, ...styles.optionSelected };
          }

          return (
            <TouchableOpacity key={option} style={optStyle} onPress={() => handleSelect(option)}
              activeOpacity={0.8} disabled={revealed}>
              <Text style={textStyle}>{option}</Text>
            </TouchableOpacity>
          );
        })}

        {revealed ? (
          <View style={styles.explanation}>
            <Text style={styles.explanationIcon}>
              {selectedAnswer === q.correct_answer ? 'âœ…' : 'âŒ'}
            </Text>
            <Text style={styles.explanationText}>{q.explanation}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Correct answer pop */}
      <Animated.View
        style={[styles.correctPopup, { opacity: correctOpacity, transform: [{ translateY: correctTranslate }] }]}
        pointerEvents="none"
      >
        <Text style={styles.correctPopupText}>â­ Correct!</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

// â”€â”€ Tier hint helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function nextTierPct(currentPct: number): number {
  if (currentPct < 30) return 30;
  if (currentPct < 40) return 40;
  if (currentPct < 50) return 50;
  if (currentPct < 60) return 60;
  if (currentPct < 70) return 70;
  if (currentPct < 80) return 80;
  if (currentPct < 90) return 90;
  return 100;
}

function nextTierCoins(currentPct: number): number {
  if (currentPct < 30) return 30;
  if (currentPct < 40) return 50;
  if (currentPct < 50) return 70;
  if (currentPct < 60) return 80;
  if (currentPct < 70) return 100;
  if (currentPct < 80) return 125;
  if (currentPct < 90) return 150;
  return 150;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { color: '#888' },

  // â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  exitBtn: { fontSize: 18, color: '#888', marginBottom: 10 },
  headerMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  chapterLabel: { fontSize: 14, fontWeight: '700', color: '#1B3A6B' },
  progress: { fontSize: 13, color: '#666' },
  progressBarTrack: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 50, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#27AE60', borderRadius: 50 },

  // â”€â”€ Quiz content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  quizContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  questionText: { fontSize: 20, fontWeight: '700', color: '#1B3A6B', lineHeight: 30, marginBottom: 24 },
  option: { borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 14, padding: 16, marginBottom: 12, backgroundColor: '#fff' },
  optionText: { fontSize: 15, color: '#222', lineHeight: 22 },
  optionSelected: { borderColor: '#1B3A6B', backgroundColor: '#EEF2FF' },
  optionCorrect:  { borderColor: '#27AE60', backgroundColor: '#E8F8EE' },
  optionWrong:    { borderColor: '#E74C3C', backgroundColor: '#FFF0F0' },
  optionTextCorrect: { color: '#1B6B3A', fontWeight: '700' },
  optionTextWrong:   { color: '#C0392B', fontWeight: '700' },
  explanation: {
    flexDirection: 'row', gap: 12, marginTop: 8,
    backgroundColor: '#F8F9FA', borderRadius: 14, padding: 16,
    borderLeftWidth: 4, borderLeftColor: '#1B3A6B',
  },
  explanationIcon: { fontSize: 18, marginTop: 2 },
  explanationText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 22 },

  // â”€â”€ Correct pop-up â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  correctPopup: {
    position: 'absolute', top: '40%', alignSelf: 'center',
    backgroundColor: '#27AE60', borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  correctPopupText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // â”€â”€ Result screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  bgPass: { backgroundColor: '#0D3B26' },
  bgFail: { backgroundColor: '#1B3A6B' },
  resultContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 36 },
  scoreCircle: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
  },
  scoreNum:   { fontSize: 36, fontWeight: '900', color: '#fff' },
  scoreLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  resultHeading: { fontSize: 26, fontWeight: '800', color: '#F0A500', marginBottom: 6, textAlign: 'center' },
  resultSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 24 },

  // â”€â”€ Progress card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  progressCard: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18,
    padding: 18, width: '100%', marginBottom: 24,
  },
  progressCardTitle: { color: '#F0A500', fontWeight: '800', fontSize: 13, textTransform: 'uppercase', marginBottom: 14 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  barPct:   { color: '#F0A500', fontSize: 13, fontWeight: '700' },
  barTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 50, overflow: 'hidden', marginBottom: 8 },
  barFill:  { height: '100%', backgroundColor: '#F0A500', borderRadius: 50 },
  quizzesText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 16 },
  coinRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  coinBlock: { flex: 1, alignItems: 'center' },
  coinDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },
  coinBig:  { fontSize: 22, fontWeight: '900', color: '#F0A500' },
  coinSub:  { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  noNewCoins: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  nextTier:   { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: 6 },

  // â”€â”€ Buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  primaryBtn: {
    backgroundColor: '#27AE60', borderRadius: 50,
    paddingVertical: 16, width: '100%', alignItems: 'center', marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  retryBtn: {
    backgroundColor: '#F0A500', borderRadius: 50,
    paddingVertical: 16, width: '100%', alignItems: 'center', marginBottom: 10,
  },
  retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  reviewBtn: { paddingVertical: 12 },
  reviewBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
});

type Props = {
