import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import { useSubscription } from '../../hooks/useSubscription';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const PLANS = {
  monthly: {
    individual: { label: 'Individual', price: '$9.99',  period: '/month', priceKey: 'INDIVIDUAL_MONTHLY' },
    family:     { label: 'Family (up to 5 kids)', price: '$14.99', period: '/month', priceKey: 'FAMILY_MONTHLY' },
  },
  yearly: {
    individual: { label: 'Individual', price: '$79.99', period: '/year', priceKey: 'INDIVIDUAL_YEARLY', savings: 'Save 33%' },
    family:     { label: 'Family (up to 5 kids)', price: '$119.99', period: '/year', priceKey: 'FAMILY_YEARLY', savings: 'Save 33%' },
  },
};

export default function UpgradeScreen() {
  const { user, selectedChild } = useAuthStore();
  const { isActive } = useSubscription();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [planType, setPlanType] = useState<'individual' | 'family'>('individual');
  const [loading, setLoading] = useState(false);

  const childName = selectedChild?.name ?? 'Your child';
  const selected = PLANS[billing][planType];

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/subscriptions/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          price_key: selected.priceKey,
          email: user.email,
        }),
      });
      const json = await res.json();
      if (json.url) {
        await WebBrowser.openBrowserAsync(json.url);
      } else {
        Alert.alert('Error', json.error ?? 'Could not start checkout.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    }
    setLoading(false);
  };

  if (isActive) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.alreadyActive}>
          <Text style={styles.alreadyIcon}>🎉</Text>
          <Text style={styles.alreadyTitle}>You're Premium!</Text>
          <Text style={styles.alreadySub}>Enjoy unlimited access to all WealthWise content.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={['#1B3A6B', '#27AE60']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroEmoji}>🎓</Text>
          <Text style={styles.heroTitle}>{childName} graduated School 1!</Text>
          <Text style={styles.heroSub}>Unlock all 7 schools + premium features to keep the momentum going.</Text>
        </LinearGradient>

        {/* Billing toggle */}
        <View style={styles.toggleRow}>
          {(['monthly', 'yearly'] as const).map((b) => (
            <TouchableOpacity
              key={b}
              style={[styles.toggleBtn, billing === b && styles.toggleBtnActive]}
              onPress={() => setBilling(b)}
            >
              <Text style={[styles.toggleBtnText, billing === b && styles.toggleBtnTextActive]}>
                {b.charAt(0).toUpperCase() + b.slice(1)}
                {b === 'yearly' ? '  Best Value 🏆' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Plan cards */}
        {(['individual', 'family'] as const).map((p) => {
          const plan = PLANS[billing][p];
          const isSelected = planType === p;
          return (
            <TouchableOpacity
              key={p}
              style={[styles.planCard, isSelected && styles.planCardSelected]}
              onPress={() => setPlanType(p)}
            >
              <View style={styles.planCardHeader}>
                <Text style={styles.planLabel}>{plan.label}</Text>
                {'savings' in plan && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>{(plan as any).savings}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.planPrice}>
                {plan.price}<Text style={styles.planPeriod}>{plan.period}</Text>
              </Text>
              {isSelected && <Text style={styles.selectedCheck}>✓ Selected</Text>}
            </TouchableOpacity>
          );
        })}

        {/* CTA */}
        <TouchableOpacity style={styles.ctaButton} onPress={handleUpgrade} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>Start Premium — {selected.price}{selected.period}</Text>
          }
        </TouchableOpacity>

        {/* Trust signals */}
        <View style={styles.trustRow}>
          {['🔒 Secure checkout', '↩️ Cancel anytime', '👨‍👩‍👧 COPPA compliant'].map((t) => (
            <Text key={t} style={styles.trustItem}>{t}</Text>
          ))}
        </View>

        {/* Features list */}
        <View style={styles.featureList}>
          <Text style={styles.featureTitle}>What you unlock:</Text>
          {[
            '📚 All 7 financial literacy schools',
            '💰 150 bonus WealthCoins every month',
            '🏦 Bank account connection & budgeting',
            '📊 Spending reports & insights',
            '🏆 Full badge & coin rewards system',
            '👨‍👩‍👧 Parent dashboard & controls',
            '🤖 AI investing bot (paper trading)',
          ].map((f) => (
            <View key={f} style={styles.featureItem}>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  content:   { padding: 20, paddingBottom: 60 },
  alreadyActive: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  alreadyIcon:  { fontSize: 64, marginBottom: 16 },
  alreadyTitle: { fontSize: 26, fontWeight: '800', color: '#27AE60', marginBottom: 8 },
  alreadySub:   { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
  hero: {
    borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 24,
  },
  heroEmoji: { fontSize: 48, marginBottom: 10 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  heroSub:   { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#E8EAEF', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#fff', elevation: 2 },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  toggleBtnTextActive: { color: '#1B3A6B' },
  planCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    marginBottom: 12, borderWidth: 2, borderColor: 'transparent',
  },
  planCardSelected: { borderColor: '#1B3A6B' },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  planLabel: { fontSize: 16, fontWeight: '700', color: '#1B3A6B' },
  savingsBadge: { backgroundColor: '#F0A500', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  savingsText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  planPrice: { fontSize: 28, fontWeight: '900', color: '#1B3A6B' },
  planPeriod: { fontSize: 14, fontWeight: '400', color: '#888' },
  selectedCheck: { fontSize: 13, color: '#27AE60', fontWeight: '700', marginTop: 6 },
  ctaButton: {
    backgroundColor: '#F0A500', borderRadius: 50, padding: 18,
    alignItems: 'center', marginTop: 8, marginBottom: 16, elevation: 3,
  },
  ctaText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  trustRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 28 },
  trustItem: { fontSize: 11, color: '#888', textAlign: 'center', fontWeight: '500' },
  featureList: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  featureTitle: { fontSize: 16, fontWeight: '800', color: '#1B3A6B', marginBottom: 12 },
  featureItem: { flexDirection: 'row', marginBottom: 10 },
  featureText: { fontSize: 14, color: '#333', lineHeight: 20 },
});
