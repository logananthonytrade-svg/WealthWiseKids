import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { StudentStackParamList } from '../../navigation/StudentNavigator';

type Props = {
  navigation: StackNavigationProp<StudentStackParamList, 'QuizIntro'>;
  route: RouteProp<StudentStackParamList, 'QuizIntro'>;
};

export default function QuizIntroScreen({ navigation, route }: Props) {
  const { schoolId, schoolTitle, lessonCount } = route.params;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.Text style={[styles.icon, { transform: [{ scale: bounceAnim }] }]}>🎓</Animated.Text>

      <Text style={styles.title}>You nailed it!</Text>
      <Text style={styles.subtitle}>
        You completed all {lessonCount} lessons in{'\n'}
        <Text style={styles.schoolName}>{schoolTitle}</Text>.
      </Text>

      <View style={styles.rewardCard}>
        <Text style={styles.rewardTitle}>Pass the quiz to earn:</Text>
        <View style={styles.rewardRow}>
          <Text style={styles.rewardIcon}>🏅</Text>
          <Text style={styles.rewardText}>{schoolTitle} graduation badge</Text>
        </View>
        <View style={styles.rewardRow}>
          <Text style={styles.rewardIcon}>💰</Text>
          <Text style={styles.rewardText}>+100 WealthCoins</Text>
        </View>
        <View style={styles.rewardRow}>
          <Text style={styles.rewardIcon}>🔓</Text>
          <Text style={styles.rewardText}>Unlock the next School</Text>
        </View>
      </View>

      <Text style={styles.requirement}>You need 80% or higher to pass.</Text>

      <TouchableOpacity
        style={styles.quizBtn}
        onPress={() => navigation.navigate('Quiz', { schoolId })}
        activeOpacity={0.85}
      >
        <Text style={styles.quizBtnText}>Take the Quiz! 🚀</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.reviewBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.reviewBtnText}>Review Lessons</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#1B3A6B',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  icon: { fontSize: 80, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', color: '#F0A500', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  schoolName: { fontWeight: '800', color: '#fff' },
  rewardCard: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16,
    padding: 20, width: '100%', marginBottom: 16,
  },
  rewardTitle: { color: '#F0A500', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', marginBottom: 12 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  rewardIcon: { fontSize: 20 },
  rewardText: { color: '#fff', fontSize: 15 },
  requirement: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 28 },
  quizBtn: {
    backgroundColor: '#27AE60', borderRadius: 50,
    paddingVertical: 16, paddingHorizontal: 40, width: '100%', alignItems: 'center', marginBottom: 12,
  },
  quizBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  reviewBtn: { paddingVertical: 12 },
  reviewBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
});
