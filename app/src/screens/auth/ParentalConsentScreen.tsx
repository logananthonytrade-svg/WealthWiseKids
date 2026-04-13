import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import useAuthStore from '../../store/authStore';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'ParentalConsent'>;
  route: RouteProp<AuthStackParamList, 'ParentalConsent'>;
};

export default function ParentalConsentScreen({ navigation, route }: Props) {
  const { childName } = route.params;
  const setConsentGiven = useAuthStore((s) => s.setConsentGiven);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const handleConsent = () => {
    setConsentGiven(true);
    navigation.goBack();
  };

  return (
    <LinearGradient colors={['#0D1F3C', '#091528']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.title}>Parental Consent Required</Text>
      <Text style={styles.subtitle}>
        Because <Text style={styles.bold}>{childName}</Text> is under 13, we are required
        by COPPA (Children's Online Privacy Protection Act) to get your explicit consent
        before creating their profile.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What WealthWise Kids Collects</Text>
        {[
          "Child's first name and date of birth",
          "App activity (lessons completed, quiz scores, badges earned)",
          "Budget entries they manually enter (if enabled)",
          "Bank transaction data (only if you explicitly connect a bank account)",
        ].map((item) => (
          <View key={item} style={styles.bulletRow}>
            <Text style={styles.bullet}>✓</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, styles.noCard]}>
        <Text style={styles.cardTitle}>What We NEVER Do</Text>
        {[
         'Share your child\'s data with advertisers or third parties',
         'Sell personal data',
         'Allow other users to contact your child',
         'Show ads to children under 13',
        ].map((item) => (
          <View key={item} style={styles.bulletRow}>
            <Text style={[styles.bullet, { color: '#C62828' }]}>✗</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.dateText}>Consent date: {today}</Text>

      <TouchableOpacity style={styles.consentBtn} onPress={handleConsent}>
        <Text style={styles.consentBtnText}>I Give My Consent</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  content: { padding: 24, paddingTop: 60, paddingBottom: 48 },
  icon: { fontSize: 52, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  bold: { fontWeight: '700', color: '#F5C518' },
  card: {
    backgroundColor: 'rgba(39,174,96,0.08)',
    borderWidth: 1, borderColor: 'rgba(39,174,96,0.2)',
    borderRadius: 14, padding: 16, marginBottom: 16,
  },
  noCard: { backgroundColor: 'rgba(198,40,40,0.08)', borderColor: 'rgba(198,40,40,0.2)' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: 10 },
  bulletRow: { flexDirection: 'row', marginBottom: 8, gap: 8 },
  bullet: { fontSize: 14, fontWeight: '800', color: '#4ADE80', marginTop: 1 },
  bulletText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },
  dateText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 28 },
  consentBtn: {
    backgroundColor: '#F5C518', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center', marginBottom: 14,
  },
  consentBtnText: { color: '#1B3A6B', fontSize: 16, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
});

