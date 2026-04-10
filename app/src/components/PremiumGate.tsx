import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../hooks/useSubscription';

interface PremiumGateProps {
  children: React.ReactNode;
  featureName?: string;
}

export default function PremiumGate({ children, featureName = 'this feature' }: PremiumGateProps) {
  const navigation = useNavigation<any>();
  const { isActive, isLoading } = useSubscription();

  if (isLoading) return <>{children}</>;
  if (isActive) return <>{children}</>;

  return (
    <View style={styles.container}>
      {/* Blurred content preview */}
      <View style={styles.blurOverlay} pointerEvents="none">
        <View style={styles.blurredContent}>{children}</View>
        <View style={styles.blur} />
      </View>

      {/* Unlock card */}
      <View style={styles.unlockCard}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.title}>Premium Feature</Text>
        <Text style={styles.subtitle}>
          Unlock {featureName} and the full curriculum with WealthWise Premium.
        </Text>
        <TouchableOpacity
          style={styles.unlockButton}
          onPress={() => navigation.navigate('Upgrade')}
        >
          <Text style={styles.unlockText}>Unlock Now</Text>
        </TouchableOpacity>
        <Text style={styles.pricing}>Starting at $4.99/month</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blurOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  blurredContent: { opacity: 0.15 },
  blur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248,249,252,0.7)',
  },
  unlockCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  lockIcon: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#1B3A6B', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  unlockButton: {
    backgroundColor: '#F0A500', paddingHorizontal: 40, paddingVertical: 16,
    borderRadius: 50, marginBottom: 12,
  },
  unlockText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  pricing: { fontSize: 13, color: '#888' },
});
