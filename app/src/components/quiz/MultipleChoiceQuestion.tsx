import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';

interface Props {
  question: string;
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string;
  explanation: string;
  revealed: boolean;
  onSelect: (answer: string) => void;
}

export default function MultipleChoiceQuestion({
  question, options, selectedAnswer, correctAnswer, explanation, revealed, onSelect,
}: Props) {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleSelect = (opt: string) => {
    if (revealed) return;
    onSelect(opt);
    if (opt !== correctAnswer) triggerShake();
  };

  const OPTIONS_LABELS = ['A', 'B', 'C', 'D'];

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question}</Text>

      <View style={styles.options}>
        {options.map((opt, idx) => {
          const isSelected = selectedAnswer === opt;
          const isCorrect  = opt === correctAnswer;
          const isWrong    = revealed && isSelected && !isCorrect;
          const isGreen    = revealed && isCorrect;

          return (
            <Animated.View
              key={opt}
              style={isWrong ? { transform: [{ translateX: shakeAnim }] } : undefined}
            >
              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  isGreen  && styles.optionCorrect,
                  isWrong  && styles.optionWrong,
                  isSelected && !revealed && styles.optionSelected,
                ]}
                onPress={() => handleSelect(opt)}
                activeOpacity={0.8}
                disabled={revealed}
              >
                <View style={[styles.optionLabel, isGreen && styles.labelGreen, isWrong && styles.labelRed]}>
                  <Text style={[styles.labelText, (isGreen || isWrong) && { color: '#fff' }]}>
                    {OPTIONS_LABELS[idx]}
                  </Text>
                </View>
                <Text style={[styles.optionText, (isGreen || isWrong) && { fontWeight: '700' }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {revealed && !options.find((o) => o === selectedAnswer && o === correctAnswer) && (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationLabel}>Explanation</Text>
          <Text style={styles.explanationText}>{explanation}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  questionText: { fontSize: 20, fontWeight: '700', color: '#1B3A6B', lineHeight: 28, marginBottom: 28 },
  options: { gap: 12 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 2, borderColor: '#ddd', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#fff',
  },
  optionSelected: { borderColor: '#1B3A6B', backgroundColor: '#F0F4FF' },
  optionCorrect:  { borderColor: '#27AE60', backgroundColor: '#F0FFF4' },
  optionWrong:    { borderColor: '#C62828', backgroundColor: '#FFF0F0' },
  optionLabel: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center',
  },
  labelGreen: { backgroundColor: '#27AE60' },
  labelRed:   { backgroundColor: '#C62828' },
  labelText:  { fontSize: 13, fontWeight: '800', color: '#555' },
  optionText: { flex: 1, fontSize: 15, color: '#222' },
  explanationBox: {
    marginTop: 20, backgroundColor: '#FFF8E1', borderLeftWidth: 4,
    borderLeftColor: '#F0A500', borderRadius: 10, padding: 16,
  },
  explanationLabel: { fontSize: 11, fontWeight: '800', color: '#F0A500', textTransform: 'uppercase', marginBottom: 4 },
  explanationText:  { fontSize: 14, color: '#444', lineHeight: 22 },
});
