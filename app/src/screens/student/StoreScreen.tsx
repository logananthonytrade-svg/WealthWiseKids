import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { useSubscription } from '../../hooks/useSubscription';
import { StudentStackParamList } from '../../navigation/StudentNavigator';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

type StoreTab = 'storefront' | 'earn' | 'mytools' | 'deals';

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
      navigation.navigate('BudgetTracker');
      break;
    case 'savings_calculator':
    case 'savings_goals':
      navigation.navigate('SavingsCalculator');
      break;
    case 'spending_analyzer':
      navigation.navigate('SpendingAnalyzer');
      break;
    default:
      Alert.alert('Coming Soon 🔨', 'This tool is under development. Check back soon!');
  }
}

export default function StoreScreen() {
  const navigation  = useNavigation<StackNavigationProp<StudentStackParamList>>();
  const { selectedChild } = useAuthStore();
  const { isActive }      = useSubscription();

  const [activeTab,    setActiveTab]    = useState<StoreTab>('storefront');
  const [balance,      setBalance]      = useState(0);
  const [items,        setItems]        = useState<StoreItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [buyingItemId, setBuyingItemId] = useState<number | null>(null);

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
        `You need ${item.coin_cost.toLocaleString()} coins but only have ${balance.toLocaleString()}.\n\nEarn more coins by completing lessons and quizzes!`,
        [{ text: 'OK', style: 'cancel' }]
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

  // ── No child selected ────────────────────────────────────────
  if (!selectedChild) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>👤</Text>
          <Text style={styles.emptyTitle}>No profile selected</Text>
          <Text style={styles.emptyDesc}>Select a child profile to access the store.</Text>
        </View>
      </View>
    );
  }

  const ownedTools = items.filter((i) => i.owned);

  return (
    <View style={styles.container}>

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
        {(['storefront', 'earn', 'mytools', 'deals'] as StoreTab[]).map((tab) => {
          const labels: Record<StoreTab, string> = {
            storefront: '🛍  Store',
            earn:       '⭐  Earn',
            mytools:    '🔧  Tools',
            deals:      '🤝  Deals',
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
          <ActivityIndicator size="large" color="#F0A500" />
        </View>
      ) : (
        <>
          {/* ══════════════════ STOREFRONT TAB ════════════════ */}
          {activeTab === 'storefront' && (
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

          {/* ═══════════════════ EARN COINS TAB ══════════════ */}
          {activeTab === 'earn' && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.toolsEmpty}>
                <Text style={styles.emptyIcon}>⭐</Text>
                <Text style={styles.emptyTitle}>Earn WealthCoins</Text>
                <Text style={styles.emptyDesc}>
                  Complete lessons, ace quizzes, and keep your streak alive to earn coins — no purchases needed.
                </Text>
              </View>
            </ScrollView>
          )}

          {/* ════════════════════ MY TOOLS TAB ════════════════ */}
          {activeTab === 'mytools' && (
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
                  <TouchableOpacity style={styles.shopCTA} onPress={() => setActiveTab('storefront')}>
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
          {/* ═══════════════════ PARTNER DEALS TAB ═══════════ */}
          {activeTab === 'deals' && (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.toolsEmpty}>
                <Text style={styles.emptyIcon}>🤝</Text>
                <Text style={styles.emptyTitle}>Partner Deals</Text>
                <Text style={styles.emptyDesc}>
                  {"Exclusive discounts from our financial wellness partners. Coming soon!"}
                </Text>
              </View>
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1628' },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  // ── Header ───────────────────────────────────────────────────
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    backgroundColor: '#0D1B2A', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  balancePill: {
    backgroundColor: 'rgba(240,165,0,0.1)', borderRadius: 50,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#F0A500',
  },
  balanceText: { fontSize: 15, fontWeight: '900', color: '#F0A500' },

  // ── Tab bar ──────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row', backgroundColor: '#0D1B2A',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tab:           { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 3, borderBottomColor: '#F0A500' },
  tabText:       { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  tabTextActive: { fontSize: 12, fontWeight: '800', color: '#F0A500' },

  scrollContent: { padding: 16, paddingBottom: 48 },
  sectionHint: {
    fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center',
    marginBottom: 14, lineHeight: 16,
  },

  // ── Shop tab ─────────────────────────────────────────────────
  shopCard: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    padding: 16, marginBottom: 12, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2, borderWidth: 1.5, borderColor: 'transparent',
  },
  shopCardOwned:  { borderColor: '#27AE60', backgroundColor: 'rgba(39,174,96,0.08)' },
  shopIcon:       { fontSize: 36, marginTop: 2 },
  shopBody:       { flex: 1 },
  shopTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  shopName:       { fontSize: 15, fontWeight: '800', color: '#fff', flex: 1 },
  ownedBadge:     { backgroundColor: '#27AE60', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  ownedBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  shopDesc:       { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 17, marginBottom: 10 },
  shopFooter:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shopCostText:   { fontSize: 13, fontWeight: '700', color: '#F0A500' },
  buyBtn:         { backgroundColor: '#1B3A6B', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  buyBtnInsufficient: { backgroundColor: '#CCC' },
  buyBtnText:     { color: '#fff', fontWeight: '700', fontSize: 12 },
  openBtnSmall:   { paddingHorizontal: 10, paddingVertical: 6 },
  openBtnSmallText: { color: '#27AE60', fontWeight: '700', fontSize: 13 },

  // ── Buy Coins tab ────────────────────────────────────────────
  // ── My Tools tab ─────────────────────────────────────────────
  toolsEmpty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  toolCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 16, marginBottom: 12, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toolIcon: { fontSize: 36 },
  toolBody: { flex: 1 },
  toolName: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  toolDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 17 },
  openBtn:  { backgroundColor: '#27AE60', borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10 },
  openBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // ── Empty states ─────────────────────────────────────────────
  emptyIcon:  { fontSize: 54, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  emptyDesc:  { fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  shopCTA:    { backgroundColor: '#1B3A6B', borderRadius: 50, paddingHorizontal: 24, paddingVertical: 12 },
  shopCTAText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
