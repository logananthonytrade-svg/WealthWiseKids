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
      navigation.navigate('ConnectBank');
      break;
    default:
      Alert.alert('Coming Soon 🔨', 'This tool is under development. Check back soon!');
  }
}

// ─────────────────────────────────────────────────────────────
// EARN TAB sub-component
// ─────────────────────────────────────────────────────────────
interface CoinEvent {
  id:          string;
  coins:       number;
  reason:      string;
  created_at:  string;
}

interface WeeklyEvent {
  id:          string;
  title:       string;
  description: string;
  reward_coins: number;
  ends_at:     string;
  type:        string;
}

function EarnTab({ balance, childId, streak }: { balance: number; childId: string | null; streak: number }) {
  const [history,       setHistory]       = useState<CoinEvent[]>([]);
  const [weeklyEvents,  setWeeklyEvents]  = useState<WeeklyEvent[]>([]);
  const [loadingInner,  setLoadingInner]  = useState(true);

  useEffect(() => {
    if (!childId) { setLoadingInner(false); return; }
    Promise.all([
      supabase
        .from('wealth_coins_log')
        .select('id, coins, reason, created_at')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('weekly_events')
        .select('id, title, description, reward_coins, ends_at, type')
        .gte('ends_at', new Date().toISOString())
        .order('ends_at'),
    ]).then(([logRes, evRes]) => {
      setHistory((logRes.data ?? []) as CoinEvent[]);
      setWeeklyEvents((evRes.data ?? []) as WeeklyEvent[]);
      setLoadingInner(false);
    });
  }, [childId]);

  const EARN_WAYS = [
    { emoji: '📚', label: 'Complete a chapter',     coins: '10 coins' },
    { emoji: '✅', label: 'Pass chapter quiz',       coins: '25 coins' },
    { emoji: '💯', label: 'Perfect quiz score',      coins: '+50 bonus' },
    { emoji: '🔥', label: 'Daily login streak',      coins: '5–50 coins' },
    { emoji: '🏆', label: 'Finish a full school',    coins: '200 coins' },
    { emoji: '📅', label: 'Weekly event win',        coins: '100–500 coins' },
  ];

  if (loadingInner) return <ActivityIndicator color="#F0A500" style={{ marginTop: 60 }} />;

  return (
    <ScrollView contentContainerStyle={earnS.scroll} showsVerticalScrollIndicator={false}>

      {/* Balance banner */}
      <View style={earnS.balanceBanner}>
        <Text style={earnS.balanceNum}>💰 {balance.toLocaleString()}</Text>
        <Text style={earnS.balanceLbl}>Your WealthCoin balance</Text>
        {streak > 0 && <Text style={earnS.streakPill}>🔥 {streak}-day streak</Text>}
      </View>

      {/* Weekly events */}
      {weeklyEvents.length > 0 && (
        <>
          <Text style={earnS.sectionTitle}>⚡ This Week's Events</Text>
          {weeklyEvents.map((ev) => {
            const daysLeft = Math.ceil(
              (new Date(ev.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return (
              <View key={ev.id} style={earnS.eventCard}>
                <View style={earnS.eventTop}>
                  <Text style={earnS.eventTitle}>{ev.title}</Text>
                  <View style={earnS.rewardPill}>
                    <Text style={earnS.rewardTxt}>+{ev.reward_coins} coins</Text>
                  </View>
                </View>
                <Text style={earnS.eventDesc}>{ev.description}</Text>
                <Text style={earnS.eventTimer}>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</Text>
              </View>
            );
          })}
        </>
      )}

      {weeklyEvents.length === 0 && (
        <View style={earnS.noEvents}>
          <Text style={earnS.noEventsEmoji}>📅</Text>
          <Text style={earnS.noEventsTxt}>New weekly events drop every Monday!</Text>
        </View>
      )}

      {/* How to earn */}
      <Text style={earnS.sectionTitle}>How to Earn</Text>
      {EARN_WAYS.map((w) => (
        <View key={w.label} style={earnS.earnRow}>
          <Text style={earnS.earnEmoji}>{w.emoji}</Text>
          <Text style={earnS.earnLabel}>{w.label}</Text>
          <Text style={earnS.earnCoins}>{w.coins}</Text>
        </View>
      ))}

      {/* Recent history */}
      {history.length > 0 && (
        <>
          <Text style={earnS.sectionTitle}>Recent Activity</Text>
          {history.map((h) => (
            <View key={h.id} style={earnS.historyRow}>
              <Text style={earnS.historyReason}>{h.reason}</Text>
              <Text style={[earnS.historyCoins, h.coins < 0 && earnS.historySpend]}>
                {h.coins > 0 ? `+${h.coins}` : h.coins} 💰
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const earnS = StyleSheet.create({
  scroll:        { padding: 16, paddingBottom: 48 },
  balanceBanner: {
    backgroundColor: 'rgba(240,165,0,0.1)', borderRadius: 18, padding: 22,
    alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(240,165,0,0.3)',
  },
  balanceNum:   { fontSize: 36, fontWeight: '900', color: '#F0A500' },
  balanceLbl:   { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  streakPill:   { marginTop: 10, backgroundColor: 'rgba(255,100,0,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 10, marginTop: 6,
  },
  eventCard: {
    backgroundColor: 'rgba(27,58,107,0.5)', borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(240,165,0,0.2)',
  },
  eventTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  eventTitle:{ fontSize: 14, fontWeight: '800', color: '#fff', flex: 1 },
  rewardPill:{ backgroundColor: '#F0A500', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  rewardTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },
  eventDesc: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 17, marginBottom: 6 },
  eventTimer:{ fontSize: 11, color: '#F0A500', fontWeight: '700' },
  noEvents:  { alignItems: 'center', paddingVertical: 24, marginBottom: 8 },
  noEventsEmoji: { fontSize: 32, marginBottom: 8 },
  noEventsTxt:   { fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
  earnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  earnEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  earnLabel: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  earnCoins: { fontSize: 12, color: '#F0A500', fontWeight: '800' },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyReason:{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  historyCoins: { fontSize: 13, fontWeight: '800', color: '#27AE60' },
  historySpend: { color: '#E74C3C' },
});


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
            <EarnTab balance={balance} childId={selectedChild?.id ?? null} streak={0} />
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
