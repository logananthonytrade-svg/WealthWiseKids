import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Modal,
} from 'react-native';
import { BadgeRecord } from '../utils/badgeUtils';

interface Props {
  badges: BadgeRecord[];
  onDismiss: () => void;
}

export default function BadgeAwardModal({ badges, onDismiss }: Props) {
  const [index, setIndex] = React.useState(0);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const visible = badges.length > 0 && index < badges.length;

  useEffect(() => {
    if (visible) {
      // Reset and animate in
      slideAnim.setValue(300);
      scaleAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50 }),
      ]).start();
    }
  }, [index, visible]);

  const handleDismiss = () => {
    if (index + 1 < badges.length) {
      setIndex((i) => i + 1);
    } else {
      setIndex(0);
      onDismiss();
    }
  };

  if (!visible) return null;

  const badge = badges[index];

  const rarityColors: Record<string, string> = {
    common: '#27AE60',
    rare:   '#1B3A6B',
    epic:   '#9B27AF',
  };
  const color = rarityColors[badge.rarity] ?? '#27AE60';

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
            { borderTopColor: color, borderTopWidth: 5 },
          ]}
        >
          <Text style={styles.newBadgeLabel}>New Badge Unlocked!</Text>
          <Text style={styles.badgeIcon}>{badge.icon_name}</Text>
          <Text style={[styles.badgeName, { color }]}>{badge.name}</Text>
          <View style={[styles.rarityPill, { backgroundColor: color }]}>
            <Text style={styles.rarityText}>{badge.rarity.toUpperCase()}</Text>
          </View>
          <Text style={styles.description}>{badge.description}</Text>

          <TouchableOpacity style={[styles.btn, { backgroundColor: color }]} onPress={handleDismiss}>
            <Text style={styles.btnText}>
              {index + 1 < badges.length ? `Awesome! (${badges.length - index - 1} more)` : 'Awesome! 🎉'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end', alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 24,
    padding: 32, width: '100%',
    alignItems: 'center', marginBottom: 0,
  },
  newBadgeLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 16 },
  badgeIcon:     { fontSize: 72, marginBottom: 12 },
  badgeName:     { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  rarityPill: {
    borderRadius: 50, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 16,
  },
  rarityText:    { color: '#fff', fontSize: 11, fontWeight: '800' },
  description:   { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  btn: {
    borderRadius: 50, paddingVertical: 14, paddingHorizontal: 36,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
