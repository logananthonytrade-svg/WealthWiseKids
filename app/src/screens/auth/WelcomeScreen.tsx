import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Animated, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = { navigation: StackNavigationProp<AuthStackParamList, 'Welcome'> };

const COIN = 100;

export default function WelcomeScreen({ navigation }: Props) {
  const coinScale = useRef(new Animated.Value(0.5)).current;
  const coinOpacity = useRef(new Animated.Value(0)).current;
  const bodyOpacity = useRef(new Animated.Value(0)).current;
  const btnSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(coinScale, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
        Animated.timing(coinOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(bodyOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(btnSlide, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={['#0D1F3C', '#091528', '#0a1a30']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>

        {/* Coin / Hero */}
        <Animated.View style={[styles.hero, { opacity: coinOpacity, transform: [{ scale: coinScale }] }]}>
          <View style={styles.glowRing} />
          <View style={styles.coinOuter}>
            <View style={styles.coinInner}>
              <Text style={styles.coinText}>WW</Text>
            </View>
          </View>
          <Text style={styles.appName}>WealthWise</Text>
          <Text style={styles.appSub}>Kids</Text>
          <Text style={styles.tagline}>Building Tomorrow's Financial Leaders</Text>
        </Animated.View>

        {/* Features */}
        <Animated.View style={[styles.features, { opacity: bodyOpacity }]}>
          <FeatureRow icon="🎓" text="Learn money fundamentals through stories" />
          <FeatureRow icon="🏆" text="Earn badges & WealthCoins as you grow" />
          <FeatureRow icon="📊" text="Track spending and build real habits" />
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={[styles.buttons, { opacity: bodyOpacity, transform: [{ translateY: btnSlide }] }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('SignUp')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('SignIn')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        </Animated.View>

      </SafeAreaView>
    </LinearGradient>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconBox}>
        <Text style={styles.featureIcon}>{icon}</Text>
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 32, justifyContent: 'space-between' },
  hero: { alignItems: 'center', paddingTop: 24 },
  glowRing: {
    position: 'absolute',
    top: -10,
    width: COIN * 2.4,
    height: COIN * 2.4,
    borderRadius: COIN * 1.2,
    backgroundColor: 'rgba(245,197,24,0.07)',
  },
  coinOuter: {
    width: COIN,
    height: COIN,
    borderRadius: COIN / 2,
    backgroundColor: '#9A6A00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 16,
    marginBottom: 18,
  },
  coinInner: {
    width: COIN * 0.84,
    height: COIN * 0.84,
    borderRadius: COIN * 0.42,
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  coinText: { fontSize: COIN * 0.2, fontWeight: '900', color: 'rgba(0,0,0,0.28)', letterSpacing: 1 },
  appName: { fontSize: 34, fontWeight: '900', color: '#F5C518', letterSpacing: 0.3 },
  appSub: { fontSize: 30, fontWeight: '900', color: '#fff', marginTop: -4, letterSpacing: 0.3 },
  tagline: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 10, textAlign: 'center', letterSpacing: 0.5 },
  features: { gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  featureIcon: { fontSize: 20 },
  featureText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 20 },
  buttons: { gap: 12 },
  primaryBtn: {
    backgroundColor: '#F5C518',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 17, fontWeight: '800', color: '#1B3A6B' },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
});

