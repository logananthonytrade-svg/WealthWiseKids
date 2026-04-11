import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { useSubscription } from '../../hooks/useSubscription';
import { StudentStackParamList } from '../../navigation/StudentNavigator';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

type StoreTab = 'shop' | 'coins' | 'tools';

interface CoinPack {
  id:           number;
  name:         string;
  coins:        number;
  price_usd:    number;
  badge_label:  string | null;
  order_number: number;
}

interface StoreItem {
  id:           number;
  name:         string;
  description:  string;
  icon:         string;
  coin_cost:    number;
  feature_key:  string;
  order_number: number;
  owned:        boolean;
}

// Maps a feature_key to the screen / action it launches.
// Add new cases here as new tools are built.
function openTool(featureKey: string, navigation: StackNavigationProp<StudentStackParamList>) {
  switch (featureKey) {
    case 'budget_tracker':
      navigation.navigate('ConnectBank');
      break;
    default:
      Alert.alert('Coming Soon 🔨', 'This tool is under development. Check back soon!');
  }
}

export default function StoreScreen() {
  const navigation  = useNavigation<StackNavigationProp<StudentStackParamList>>();
  const { selectedChild } = useAuthStore();
  const { isActive }      = useSubscription();

  const [activeTab,    setActiveTab]    = useState<StoreTab>('shop');
  const [balance,      setBalance]      = useState(0);
  const [packs,        setPacks]        = useState<CoinPack[]>([]);
  const [items,        setItems]        = useState<StoreItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [buyingItemId, setBuyingItemId] = useState<number | null>(null);
  const [buyingPackId, setBuyingPackId] = useState<number | null>(null);

  useEffect(() => {
    loadCatalog();
    // Silently claim the monthly premium bonus on each fresh mount — idempotent
    if (isActive && selectedChild) claimMonthlyBonus();
  }, [selectedChild?.id]);

  // ── Data loading ─────────────────────────────────────────────
  const loadCatalog = async () => {
    if (!selectedChild) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/store/catalog/${selectedChild.id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? 0);
        setPacks(data.packs ?? []);
        setItems(data.items ?? []);
      }
    } catch (err) {
      console.error('StoreScreen loadCatalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const claimMonthlyBonus = async () => {
    if (!selectedChild) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/store/claim-monthly-bonus`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body:    JSON.stringify({ child_id: selectedChild.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.coins_awarded > 0) {
          setBalance((b) => b + data.coins_awarded);
          Alert.alert(
            '💰 Monthly Bonus!',
            `${data.coins_awarded} WealthCoins added — your Premium monthly reward!`
          );
        }
      }
    } catch (err) {
      console.error('claimMonthlyBonus:', err);
    }
  };

  // ── Purchase handlers ────────────────────────────────────────
  const handleBuyItem = (item: StoreItem) => {
    if (item.owned) return;

    if (balance < item.coin_cost) {
      Alert.alert(
        'Not enough coins',
        `You need ${item.coin_cost.toLocaleString()} coins but only have ${balance.toLocaleString()}.\n\nBuy a coin pack or earn more by completing lessons!`,
        [
          { text: 'Buy Coins', onPress: () => setActiveTab('coins') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    Alert.alert(
      `Buy ${item.name}?`,
      `This will use ${item.coin_cost.toLocaleString()} coins.\n\nBalance after purchase: ${(balance - item.coin_cost).toLocaleString()} coins`,
      [
        {
          text: 'Confirm',
          onPress: async () => {
            setBuyingItemId(item.id);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const res = await fetch(`${API_URL}/store/buy-item`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body:    JSON.stringify({ child_id: selectedChild!.id, item_id: item.id }),
              });
              const data = await res.json();
              if (res.ok) {
                setBalance(data.new_balance);
                setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, owned: true } : i));
                Alert.alert('✅ Purchased!', `${item.name} is now in "My Tools".`);
              } else {
                Alert.alert('Purchase failed', data.error ?? 'Please try again.');
              }
            } catch {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setBuyingItemId(null);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleBuyCoins = async (pack: CoinPack) => {
    if (!selectedChild) return;
    setBuyingPackId(pack.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/store/buy-coins`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body:    JSON.stringify({ child_id: selectedChild.id, pack_id: pack.id }),
      });
      const data = await res.json();
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        // Refresh balance after returning — coins are awarded via webhook
        await loadCatalog();
      } else {
        Alert.alert('Error', data.error ?? 'Could not start checkout.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setBuyingPackId(null);
    }
  };

  // ── No child selected ────────────────────────────────────────
  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>👤</Text>
          <Text style={styles.emptyTitle}>No profile selected</Text>
          <Text style={styles.emptyDesc}>Select a child profile to access the store.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ownedTools = items.filter((i) => i.owned);

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Balance header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>WealthWise Store</Text>
          <Text style={styles.headerSub}>Earn coins from schools · spend on tools</Text>
        </View>
        <View style={styles.balancePill}>
          <Text style={styles.balanceText}>💰 {balance.toLocaleString()}</Text>
        </View>
      </View>

      {/* ── Tab bar ────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {(['shop', 'coins', 'tools'] as StoreTab[]).map((tab) => {
          const labels: Record<StoreTab, string> = {
            shop:  '🛍  Shop',
            coins: '💎  Buy Coins',
            tools: '🔧  My Tools',
          };
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {labels[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1B3A6B" />
        </View>
      ) : (
        <>
          {/* ════════════════════ SHOP TAB ════════════════════ */}
          {activeTab === 'shop' && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionHint}>Permanent unlocks — yours forever once purchased</Text>

              {items.map((item) => (
                <View key={item.id} style={[styles.shopCard, item.owned && styles.shopCardOwned]}>
                  <Text style={styles.shopIcon}>{item.icon}</Text>
                  <View style={styles.shopBody}>
                    <View style={styles.shopTitleRow}>
                      <Text style={styles.shopName}>{item.name}</Text>
                      {item.owned && (
                        <View style={styles.ownedBadge}>
                          <Text style={styles.ownedBadgeText}>Owned ✓</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.shopDesc}>{item.description}</Text>
                    <View style={styles.shopFooter}>
                      <Text style={styles.shopCostText}>
                        {item.owned ? 'Purchased' : `💰 ${item.coin_cost.toLocaleString()} coins`}
                      </Text>
                      {!item.owned && (
                        <TouchableOpacity
                          style={[
                            styles.buyBtn,
                            balance < item.coin_cost && styles.buyBtnInsufficient,
                          ]}
                          onPress={() => handleBuyItem(item)}
                          disabled={buyingItemId === item.id}
                          activeOpacity={0.85}
                        >
                          {buyingItemId === item.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.buyBtnText}>
                              {balance < item.coin_cost ? 'Need more coins' : 'Buy'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                      {item.owned && (
                        <TouchableOpacity
                          style={styles.openBtnSmall}
                          onPress={() => openTool(item.feature_key, navigation)}
                        >
                          <Text style={styles.openBtnSmallText}>Open →</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* ═══════════════════ BUY COINS TAB ═══════════════ */}
          {activeTab === 'coins' && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Premium bonus banner */}
              {isActive && (
                <View style={styles.premiumBanner}>
                  <Text style={styles.premiumBannerIcon}>⭐</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.premiumBannerTitle}>Premium Monthly Bonus</Text>
                    <Text style={styles.premiumBannerSub}>150 coins added automatically every month</Text>
                  </View>
                </View>
              )}

              <Text style={styles.sectionHint}>One-time purchase · coins never expire</Text>

              {packs.map((pack) => {
                const cppCents = ((pack.price_usd / pack.coins) * 100).toFixed(1);
                const isLoading = buyingPackId === pack.id;
                const isPopular = pack.badge_label === 'Popular';
                const isBestVal = pack.badge_label === 'Best Value';

                return (
                  <TouchableOpacity
                    key={pack.id}
                    style={[
                      styles.packCard,
                      isPopular && styles.packCardPopular,
                      isBestVal && styles.packCardBestVal,
                    ]}
                    onPress={() => handleBuyCoins(pack)}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {pack.badge_label && (
                      <View style={[styles.packBadge, isBestVal && styles.packBadgeBestVal]}>
                        <Text style={styles.packBadgeText}>
                          {isPopular ? '🔥 Popular' : '💎 Best Value'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.packRow}>
                      <View>
                        <Text style={styles.packName}>{pack.name}</Text>
                        <Text style={styles.packCoins}>💰 {pack.coins.toLocaleString()} coins</Text>
                        <Text style={styles.packCpp}>~{cppCents}¢ per coin</Text>
                      </View>
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <View style={styles.packPricePill}>
                          <Text style={styles.packPriceText}>${pack.price_usd.toFixed(2)}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.stripeNote}>
                🔒 Secure checkout via Stripe. Coins appear after payment confirmation.
              </Text>
            </ScrollView>
          )}

          {/* ════════════════════ MY TOOLS TAB ════════════════ */}
          {activeTab === 'tools' && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {ownedTools.length === 0 ? (
                <View style={styles.toolsEmpty}>
                  <Text style={styles.emptyIcon}>🧰</Text>
                  <Text style={styles.emptyTitle}>No tools yet</Text>
                  <Text style={styles.emptyDesc}>
                    {"You haven't bought any tools yet. Check out the Shop to unlock powerful features like the Budget Tracker!"}
                  </Text>
                  <TouchableOpacity style={styles.shopCTA} onPress={() => setActiveTab('shop')}>
                    <Text style={styles.shopCTAText}>Browse the Shop →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                ownedTools.map((tool) => (
                  <View key={tool.id} style={styles.toolCard}>
                    <Text style={styles.toolIcon}>{tool.icon}</Text>
                    <View style={styles.toolBody}>
                      <Text style={styles.toolName}>{tool.name}</Text>
                      <Text style={styles.toolDesc}>{tool.description}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.openBtn}
                      onPress={() => openTool(tool.feature_key, navigation)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.openBtnText}>Open</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  // ── Header ───────────────────────────────────────────────────
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1B3A6B' },
  headerSub:   { fontSize: 12, color: '#888', marginTop: 2 },
  balancePill: {
    backgroundColor: '#FFF7E6', borderRadius: 50,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#F0A500',
  },
  balanceText: { fontSize: 15, fontWeight: '900', color: '#C07800' },

  // ── Tab bar ──────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  tab:           { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 3, borderBottomColor: '#1B3A6B' },
  tabText:       { fontSize: 12, fontWeight: '600', color: '#999' },
  tabTextActive: { fontSize: 12, fontWeight: '800', color: '#1B3A6B' },

  scrollContent: { padding: 16, paddingBottom: 48 },
  sectionHint: {
    fontSize: 12, color: '#888', textAlign: 'center',
    marginBottom: 14, lineHeight: 16,
  },

  // ── Shop tab ─────────────────────────────────────────────────
  shopCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 12, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2, borderWidth: 1.5, borderColor: 'transparent',
  },
  shopCardOwned:  { borderColor: '#27AE60', backgroundColor: '#F2FBF5' },
  shopIcon:       { fontSize: 36, marginTop: 2 },
  shopBody:       { flex: 1 },
  shopTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  shopName:       { fontSize: 15, fontWeight: '800', color: '#1B3A6B', flex: 1 },
  ownedBadge:     { backgroundColor: '#27AE60', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  ownedBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  shopDesc:       { fontSize: 12, color: '#555', lineHeight: 17, marginBottom: 10 },
  shopFooter:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shopCostText:   { fontSize: 13, fontWeight: '700', color: '#F0A500' },
  buyBtn:         { backgroundColor: '#1B3A6B', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  buyBtnInsufficient: { backgroundColor: '#CCC' },
  buyBtnText:     { color: '#fff', fontWeight: '700', fontSize: 12 },
  openBtnSmall:   { paddingHorizontal: 10, paddingVertical: 6 },
  openBtnSmallText: { color: '#27AE60', fontWeight: '700', fontSize: 13 },

  // ── Buy Coins tab ────────────────────────────────────────────
  premiumBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF7E6', borderRadius: 14,
    padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#F0A500',
  },
  premiumBannerIcon:  { fontSize: 28 },
  premiumBannerTitle: { fontSize: 14, fontWeight: '800', color: '#C07800' },
  premiumBannerSub:   { fontSize: 12, color: '#888', marginTop: 2 },

  packCard:        { backgroundColor: '#1B3A6B', borderRadius: 16, padding: 18, marginBottom: 12 },
  packCardPopular: { backgroundColor: '#0D3B26' },
  packCardBestVal: { backgroundColor: '#1B4A6B' },
  packBadge:       { backgroundColor: '#F0A500', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 10 },
  packBadgeBestVal: { backgroundColor: '#27AE60' },
  packBadgeText:   { color: '#fff', fontSize: 11, fontWeight: '800' },
  packRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packName:        { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  packCoins:       { fontSize: 15, fontWeight: '700', color: '#F0A500' },
  packCpp:         { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 },
  packPricePill:   { backgroundColor: '#F0A500', borderRadius: 50, paddingHorizontal: 18, paddingVertical: 10 },
  packPriceText:   { color: '#fff', fontSize: 18, fontWeight: '900' },
  stripeNote:      { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 12, lineHeight: 18 },

  // ── My Tools tab ─────────────────────────────────────────────
  toolsEmpty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  toolCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, marginBottom: 12, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toolIcon: { fontSize: 36 },
  toolBody: { flex: 1 },
  toolName: { fontSize: 16, fontWeight: '800', color: '#1B3A6B', marginBottom: 4 },
  toolDesc: { fontSize: 12, color: '#555', lineHeight: 17 },
  openBtn:  { backgroundColor: '#27AE60', borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10 },
  openBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // ── Empty states ─────────────────────────────────────────────
  emptyIcon:  { fontSize: 54, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1B3A6B', marginBottom: 8, textAlign: 'center' },
  emptyDesc:  { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  shopCTA:    { backgroundColor: '#1B3A6B', borderRadius: 50, paddingHorizontal: 24, paddingVertical: 12 },
  shopCTAText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
