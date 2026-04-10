import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import supabase from '../../lib/supabase';
import MultipleChoiceQuestion from '../../components/quiz/MultipleChoiceQuestion';
import TrueFalseQuestion from '../../components/quiz/TrueFalseQuestion';

type Props = {
  navigation: StackNavigationProp<StudentStackParamList, 'Quiz'>;
  route: RouteProp<StudentStackParamList, 'Quiz'>;
};

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'fill_blank';
  options: string[];
  correct_answer: string;
  explanation: string;
}

type AnswerRecord = {
  questionId: string;
  selectedAnswer: string;
  wasCorrect: boolean;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizScreen({ navigation, route }: Props) {
  const { schoolId } = route.params;

  const [questions, setQuestions]     = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [selectedAnswer, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed]       = useState(false);
  const [answers, setAnswers]         = useState<AnswerRecord[]>([]);
  const [loading, setLoading]         = useState(true);

  // Coins animation
  const coinsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    const { data } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('school_id', schoolId)
      .order('order_number', { ascending: true });

    setQuestions(shuffle(data ?? []));
    setLoading(false);
  };

  const handleSelect = (answer: string) => {
    if (revealed) return;
    setSelected(answer);
    setRevealed(true);

    const q         = questions[currentIdx];
    const wasCorrect = answer === q.correct_answer;

    // Animate +10 coins pop
    if (wasCorrect) {
      coinsAnim.setValue(0);
      Animated.sequence([
        Animated.timing(coinsAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(800),
        Animated.timing(coinsAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }

    const newAnswers = [
      ...answers,
      { questionId: q.id, selectedAnswer: answer, wasCorrect },
    ];
    setAnswers(newAnswers);

    // Auto-advance after delay
    const delay = wasCorrect ? 1000 : 2200;
    setTimeout(() => advanceToNext(newAnswers), delay);
  };

  const advanceToNext = (currentAnswers: AnswerRecord[]) => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) {
      // Quiz finished — calculate score and navigate
      const correct = currentAnswers.filter((a) => a.wasCorrect).length;
      const score   = Math.round((correct / questions.length) * 100);

      navigation.replace('QuizResults', {
        schoolId,
        schoolTitle: '',    // QuizResults screen also fetches this if needed
        score,
        passed: score >= 80,
        answers: currentAnswers,
      });
    } else {
      setCurrentIdx(nextIdx);
      setSelected(null);
      setRevealed(false);
    }
  };

  if (loading || questions.length === 0) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.loadingText}>Loading quiz…</Text>
      </SafeAreaView>
    );
  }

  const q = questions[currentIdx];

  // Coins pop-up animation values
  const coinsOpacity   = coinsAnim;
  const coinsTranslate = coinsAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.exitBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.progress}>Question {currentIdx + 1} of {questions.length}</Text>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${((currentIdx + 1) / questions.length) * 100}%` }]} />
        </View>
      </View>

      {/* Question */}
      {q.question_type === 'multiple_choice' ? (
        <MultipleChoiceQuestion
          key={q.id}
          question={q.question_text}
          options={q.options}
          selectedAnswer={selectedAnswer}
          correctAnswer={q.correct_answer}
          explanation={q.explanation}
          revealed={revealed}
          onSelect={handleSelect}
        />
      ) : (
        <TrueFalseQuestion
          key={q.id}
          question={q.question_text}
          selectedAnswer={selectedAnswer}
          correctAnswer={q.correct_answer}
          explanation={q.explanation}
          revealed={revealed}
          onSelect={handleSelect}
        />
      )}

      {/* +10 coins animation */}
      <Animated.View
        style={[
          styles.coinsPopup,
          { opacity: coinsOpacity, transform: [{ translateY: coinsTranslate }] },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.coinsText}>+10 💰</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  exitBtn: { fontSize: 18, color: '#888', marginBottom: 12 },
  progress: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8 },
  progressBarTrack: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 50, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#27AE60', borderRadius: 50 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888' },
  coinsPopup: {
    position: 'absolute', top: '40%', alignSelf: 'center',
    backgroundColor: '#F0A500', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 10,
  },
  coinsText: { color: '#fff', fontWeight: '800', fontSize: 18 },
});
