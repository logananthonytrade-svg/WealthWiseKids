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

const PLAN = {
  label:    'WealthWise Premium',
  price:    '$14.99',
  period:   '/year',
  priceKey: 'PREMIUM_YEARLY',
  perMonth: '$1.25/month billed annually',
};

export default function UpgradeScreen() {
  const { user, selectedChild } = useAuthStore();
  const { isActive } = useSubscription();
  const [loading, setLoading] = useState(false);

  const childName = selectedChild?.name ?? 'Your child';

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/subscriptions/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:   user.id,
          plan:      'premium',
          interval:  'yearly',
          email:     user.email,
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
        <LinearGradient
          colors={['#1B3A6B', '#0D5E3A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEmoji}>🎓</Text>
          <Text style={styles.heroTitle}>{childName} is on a roll!</Text>
          <Text style={styles.heroSub}>
            Unlock every school, every tool, and every simulation for less than a coffee a month.
          </Text>
        </LinearGradient>

        {/* Single plan card */}
        <View style={styles.planCard}>
          <View style={styles.planBadgeRow}>
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>🏆 Best Value</Text>
            </View>
          </View>
          <Text style={styles.planLabel}>{PLAN.label}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.planPrice}>{PLAN.price}</Text>
            <Text style={styles.planPeriod}>{PLAN.period}</Text>
          </View>
          <Text style={styles.perMonth}>{PLAN.perMonth}</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.ctaButton} onPress={handleUpgrade} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>Unlock Premium — {PLAN.price}{PLAN.period}</Text>
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
          <Text style={styles.featureTitle}>Everything included:</Text>
          {[
            '📚 All 7 financial literacy schools',
            '💰 WealthCoins earned from lessons & events',
            '🏦 Bank account connection & budgeting',
            '📊 Spending reports & insights',
            '📈 Virtual stock, crypto & real estate simulations',
            '🏆 Full badge & achievement system',
            '🎮 Mini games & avatar customization',
            '👨‍👩‍👧 Parent dashboard & approval controls',
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
  container: { flex: 1, backgroundColor: '#080F1E' },
  content:   { padding: 20, paddingBottom: 60 },
  alreadyActive: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  alreadyIcon:  { fontSize: 64, marginBottom: 16 },
  alreadyTitle: { fontSize: 26, fontWeight: '800', color: '#27AE60', marginBottom: 8 },
  alreadySub:   { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
  hero: {
    borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 24,
  },
  heroEmoji: { fontSize: 48, marginBottom: 10 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  heroSub:   { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 24,
    marginBottom: 20, borderWidth: 2, borderColor: '#F0A500',
  },
  planBadgeRow:    { marginBottom: 12 },
  bestValueBadge:  {
    backgroundColor: '#F0A500', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start',
  },
  bestValueText:   { fontSize: 12, fontWeight: '800', color: '#fff' },
  planLabel:       { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  priceRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 4 },
  planPrice:       { fontSize: 42, fontWeight: '900', color: '#fff' },
  planPeriod:      { fontSize: 16, fontWeight: '400', color: 'rgba(255,255,255,0.5)', paddingBottom: 6 },
  perMonth:        { fontSize: 13, color: '#F0A500', fontWeight: '600' },
  ctaButton: {
    backgroundColor: '#F0A500', borderRadius: 50, padding: 18,
    alignItems: 'center', marginTop: 8, marginBottom: 16, elevation: 3,
  },
  ctaText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  trustRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 28 },
  trustItem: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontWeight: '500' },
  featureList: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  featureTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 12 },
  featureItem:  { flexDirection: 'row', marginBottom: 10 },
  featureText:  { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
});

