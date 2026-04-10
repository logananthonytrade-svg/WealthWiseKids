import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  completed: number;
  total: number;
}

export default function LessonProgressBar({ completed, total }: Props) {
  const percent  = total > 0 ? Math.round((completed / total) * 100) : 0;
  const widthPct = `${percent}%` as any;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: widthPct }]} />
      </View>
      <Text style={styles.label}>{percent}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: {
    flex: 1, height: 8, backgroundColor: '#E0E0E0',
    borderRadius: 50, overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#27AE60', borderRadius: 50 },
  label: { fontSize: 12, fontWeight: '700', color: '#27AE60', width: 34 },
});
