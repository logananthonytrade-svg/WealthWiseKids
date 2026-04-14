import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface Props {
  amount: number;
  nonce: number;
}

export default function CoinAwardPop({ amount, nonce }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (amount <= 0 || nonce === 0) return;

    opacity.setValue(0);
    translateY.setValue(14);
    scale.setValue(0.9);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -12, duration: 620, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 90, friction: 7 }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [amount, nonce, opacity, scale, translateY]);

  if (amount <= 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      <View style={styles.pill}>
        <Text style={styles.text}>+{amount} coins</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 18,
    right: 20,
    zIndex: 40,
  },
  pill: {
    backgroundColor: 'rgba(39,174,96,0.94)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  text: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
});
