import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  question: string;
  selectedAnswer: string | null;
  correctAnswer: string;
  explanation: string;
  revealed: boolean;
  onSelect: (answer: string) => void;
}

export default function TrueFalseQuestion({
  question, selectedAnswer, correctAnswer, explanation, revealed, onSelect,
}: Props) {
  const renderBtn = (label: 'True' | 'False') => {
    const isSelected = selectedAnswer === label;
    const isCorrect  = label === correctAnswer;
    const isGreen    = revealed && isCorrect;
    const isWrong    = revealed && isSelected && !isCorrect;

    return (
      <TouchableOpacity
        key={label}
        style={[styles.btn, isGreen && styles.btnGreen, isWrong && styles.btnRed,
                isSelected && !revealed && styles.btnSelected]}
        onPress={() => !revealed && onSelect(label)}
        activeOpacity={0.8}
        disabled={revealed}
      >
        <Text style={[styles.btnText, (isGreen || isWrong) && { color: '#fff' }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question}</Text>
      <View style={styles.btnRow}>
        {renderBtn('True')}
        {renderBtn('False')}
      </View>

      {revealed && selectedAnswer !== correctAnswer && (
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
  questionText: { fontSize: 20, fontWeight: '700', color: '#1B3A6B', lineHeight: 28, marginBottom: 40 },
  btnRow: { flexDirection: 'row', gap: 16 },
  btn: {
    flex: 1, paddingVertical: 24, borderRadius: 16,
    borderWidth: 2, borderColor: '#ddd', backgroundColor: '#fff',
    alignItems: 'center',
  },
  btnSelected: { borderColor: '#1B3A6B', backgroundColor: '#F0F4FF' },
  btnGreen:    { borderColor: '#27AE60', backgroundColor: '#27AE60' },
  btnRed:      { borderColor: '#C62828', backgroundColor: '#C62828' },
  btnText:     { fontSize: 20, fontWeight: '800', color: '#333' },
  explanationBox: {
    marginTop: 28, backgroundColor: '#FFF8E1', borderLeftWidth: 4,
    borderLeftColor: '#F0A500', borderRadius: 10, padding: 16,
  },
  explanationLabel: { fontSize: 11, fontWeight: '800', color: '#F0A500', textTransform: 'uppercase', marginBottom: 4 },
  explanationText:  { fontSize: 14, color: '#444', lineHeight: 22 },
});
