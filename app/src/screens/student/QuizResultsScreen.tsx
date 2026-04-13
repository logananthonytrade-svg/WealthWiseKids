import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import supabase from '../../lib/supabase';
import useAuthStore, { type AuthState } from '../../store/authStore';
import { checkAndAwardBadges, checkAndAwardPerfectCountBadges } from '../../utils/badgeUtils';
import BadgeAwardModal from '../../components/BadgeAwardModal';
import { BadgeRecord } from '../../utils/badgeUtils';
import { awardCoins } from '../../utils/rewardUtils';
import CoinAwardPop from '../../components/CoinAwardPop';
import { hapticTap, hapticSuccess } from '../../utils/haptics';

type Props = {
  navigation: StackNavigationProp<StudentStackParamList, 'QuizResults'>;
  route: RouteProp<StudentStackParamList, 'QuizResults'>;
};

export default function QuizResultsScreen({ navigation, route }: Props) {
  const { schoolId, score, passed, answers } = route.params;
  const selectedChild = useAuthStore((s: AuthState) => s.selectedChild);

  const [newBadges, setNewBadges]     = React.useState<BadgeRecord[]>([]);
  const [schoolCoins, setSchoolCoins] = React.useState<{ earned: number; percentage: number } | null>(null);
  const [coinPop, setCoinPop]         = React.useState({ amount: 0, nonce: 0 });
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50 }).start();
    if (selectedChild) {
      recordResults();
      fetchSchoolCoins();
    }
  }, []);

  const fetchSchoolCoins = async () => {
    if (!selectedChild) return;
    const { data } = await supabase
      .from('school_coin_awards')
      .select('best_coins_earned, best_percentage')
      .eq('child_id', selectedChild.id)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (data) setSchoolCoins({ earned: data.best_coins_earned ?? 0, percentage: data.best_percentage ?? 0 });
  };

  const recordResults = async () => {
    if (!selectedChild) return;
    const childId = selectedChild.id;

    // 1. Save quiz attempt
    await supabase.from('quiz_attempts').insert({
      child_id: childId,
      school_id: schoolId,
      score,
      passed,
      answers,
      attempted_at: new Date().toISOString(),
    });

    if (passed) {
      let earnedCoins = 0;
      // ── Coin awards (backend-gated, idempotent) ─────────────────
      // 25 coins for passing the school quiz (one-time per school)
      const quizPassReward = await awardCoins(childId, 'quiz_pass', { school_id: schoolId });
      earnedCoins += quizPassReward?.coins_awarded ?? 0;
      // 200 coins for completing the full school (same trigger, separate reward_key)
      const schoolReward = await awardCoins(childId, 'school_complete', { school_id: schoolId });
      earnedCoins += schoolReward?.coins_awarded ?? 0;
      // 50 bonus coins for a perfect score (one-time per school)
      if (score === 100) {
        const perfectReward = await awardCoins(childId, 'quiz_perfect', { school_id: schoolId });
        earnedCoins += perfectReward?.coins_awarded ?? 0;
      }

      if (earnedCoins > 0) {
        setCoinPop({ amount: earnedCoins, nonce: Date.now() });
        hapticSuccess();
      }

      // 2. Award graduation badge
      const allBadges: BadgeRecord[] = [];
      const gradBadges = await checkAndAwardBadges(childId, 'school_complete', String(schoolId));
      allBadges.push(...gradBadges);

      // 3. Check all_schools_complete — fire if child has passed all known schools
      const { count: schoolCount } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true });
      const { count: passedCount } = await supabase
        .from('quiz_attempts')
        .select('school_id')
        .eq('child_id', childId)
        .eq('passed', true);
      const distinctPassed = new Set(
        ((await supabase.from('quiz_attempts').select('school_id').eq('child_id', childId).eq('passed', true)).data ?? [])
          .map((r: any) => r.school_id)
      ).size;
      if (distinctPassed >= (schoolCount ?? Infinity)) {
        const allSchoolBadges = await checkAndAwardBadges(childId, 'all_schools_complete');
        allBadges.push(...allSchoolBadges);
      }

      // 4. Check for 100% badges (single + count milestones)
      if (score === 100) {
        const perfBadges = await checkAndAwardBadges(childId, 'quiz_perfect');
        allBadges.push(...perfBadges);
        const countBadges = await checkAndAwardPerfectCountBadges(childId);
        allBadges.push(...countBadges);
      }

      if (allBadges.length > 0) setNewBadges(allBadges);
    }
  };

  type Answer = { questionId: string; selectedAnswer: string; wasCorrect: boolean };
  const missedAnswers = (answers as Answer[]).filter((a: Answer) => !a.wasCorrect);
  const correctCount  = answers.length - missedAnswers.length;

  return (
    <SafeAreaView style={[styles.container, passed ? styles.bgPassed : styles.bgFailed]}>
      <CoinAwardPop amount={coinPop.amount} nonce={coinPop.nonce} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Score circle */}
        <Animated.View style={[styles.scoreCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.scoreNum}>{score}%</Text>
          <Text style={styles.scoreLabel}>{passed ? '🎉 Passed!' : 'Not yet'}</Text>
        </Animated.View>

        {/* Result heading */}
        <Text style={styles.heading}>
          {passed
            ? `School ${schoolId} Complete!`
            : `So close! You need 80% to pass.`}
        </Text>

        <Text style={styles.subheading}>
          {passed
            ? `You got ${correctCount} out of ${answers.length} correct.`
            : `You got ${correctCount} out of ${answers.length} correct.`}
        </Text>

        {/* School coin total */}
        <View style={styles.rewardRow}>
          {schoolCoins != null ? (
            <Text style={styles.rewardText}>
              💰 School coins: {schoolCoins.earned}/150 earned
              {schoolCoins.percentage > 0 ? ` · ${schoolCoins.percentage.toFixed(0)}%` : ''}
            </Text>
          ) : (
            <Text style={styles.rewardText}>💰 Coins tracked by chapter quiz scores</Text>
          )}
        </View>

        {/* Missed topics — only when failed */}
        {!passed && missedAnswers.length > 0 && (
          <View style={styles.missedBox}>
            <Text style={styles.missedTitle}>{missedAnswers.length} question{missedAnswers.length > 1 ? 's' : ''} to review:</Text>
            {missedAnswers.map((a: Answer, i: number) => (
              <Text key={i} style={styles.missedItem}>• Question {i + 1}</Text>
            ))}
          </View>
        )}

        {/* Actions */}
        {passed ? (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => { hapticTap(); navigation.replace('SwipeHome'); }}
            >
              <Text style={styles.primaryBtnText}>Continue to Next School 🚀</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => { hapticTap(); navigation.replace('Quiz', { schoolId }); }}
            >
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => { hapticTap(); navigation.goBack(); }}
            >
              <Text style={styles.secondaryBtnText}>Review the Lessons</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <BadgeAwardModal badges={newBadges} onDismiss={() => setNewBadges([])} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgPassed:  { backgroundColor: '#1B3A6B' },
  bgFailed:  { backgroundColor: '#333' },
  content:   { alignItems: 'center', padding: 28, paddingTop: 60 },
  scoreCircle: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 4, borderColor: '#F0A500',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  scoreNum:    { fontSize: 38, fontWeight: '900', color: '#F0A500' },
  scoreLabel:  { fontSize: 14, color: '#fff', fontWeight: '600' },
  heading:     { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subheading:  { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  rewardRow:   {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 50,
    paddingHorizontal: 20, paddingVertical: 10, marginBottom: 28,
  },
  rewardText:  { color: '#F0A500', fontWeight: '700', fontSize: 15 },
  missedBox:   {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 16, width: '100%', marginBottom: 28,
  },
  missedTitle: { color: '#fff', fontWeight: '700', marginBottom: 8 },
  missedItem:  { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 4 },
  primaryBtn:  {
    backgroundColor: '#27AE60', borderRadius: 50,
    paddingVertical: 16, paddingHorizontal: 32, width: '100%', alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText:   { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn:     { paddingVertical: 12 },
  secondaryBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
});
