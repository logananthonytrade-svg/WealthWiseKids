import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = { navigation: StackNavigationProp<AuthStackParamList, 'Welcome'> };

const { height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <LinearGradient colors={['#1B3A6B', '#0D7377']} style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.hero}>
        <Text style={styles.logo}>💰</Text>
        <Text style={styles.appName}>WealthWise Kids</Text>
        <Text style={styles.tagline}>Financial Intelligence. Built Early.</Text>
      </View>

      <View style={styles.features}>
        <FeatureItem icon="🎓" text="Learn money fundamentals through stories" />
        <FeatureItem icon="🏆" text="Earn badges and WealthCoins as you grow" />
        <FeatureItem icon="📊" text="Track real spending and build good habits" />
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('SignUp')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('SignIn')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 48 },
  hero: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 72, marginBottom: 12 },
  appName: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.75)', marginTop: 8, textAlign: 'center' },
  features: { marginBottom: 48 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  featureIcon: { fontSize: 24, marginRight: 14 },
  featureText: { fontSize: 15, color: 'rgba(255,255,255,0.9)', flex: 1 },
  buttons: { gap: 14 },
  primaryBtn: {
    backgroundColor: '#F0A500',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#1B3A6B' },
  secondaryBtn: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
});
