import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';

// ─── Types ───────────────────────────────────────────────────
interface Asset {
  symbol:      string;
  name:        string;
  emoji:       string;
  category:    'stock' | 'crypto' | 'realestate';
  // Simulated price generated deterministically from symbol seed + day offset
  price:       number;
  change_pct:  number; // today's change
}

interface Holding {
  symbol:    string;
  shares:    number;
  avg_cost:  number;
}

type PortfolioTab = 'portfolio' | 'market' | 'learn';

// ─── Simulated price engine ───────────────────────────────────
// Prices are deterministic per symbol + day so they're consistent
// across the session but "change" each day. No real API needed.
const SEEDS: Record<string, number> = {
  AAPL: 182, MSFT: 378, TSLA: 248, AMZN: 194, GOOGL: 167,
  BTC: 62000, ETH: 3100, BNB: 580,
  RE_NYC: 450, RE_LA: 520, RE_MIA: 310,
};

function simulatedPrice(symbol: string): { price: number; change_pct: number } {
  const seed   = SEEDS[symbol] ?? 100;
  const day    = Math.floor(Date.now() / 86400000); // changes daily
  // Deterministic pseudo-random using day + symbol hash
  const hash   = [...symbol].reduce((acc, c) => acc * 31 + c.charCodeAt(0), day);
  const factor = 1 + ((hash % 1000) - 500) / 10000; // -5% to +5% daily
  const price  = +(seed * factor).toFixed(2);
  const change = +((factor - 1) * 100).toFixed(2);
  return { price, change_pct: change };
}

// ─── Static asset catalogue ──────────────────────────────────
function buildCatalogue(): Asset[] {
  const raw: Omit<Asset, 'price' | 'change_pct'>[] = [
    { symbol: 'AAPL',   name: 'Apple Inc.',           emoji: '🍎', category: 'stock' },
    { symbol: 'MSFT',   name: 'Microsoft Corp.',       emoji: '🖥️', category: 'stock' },
    { symbol: 'TSLA',   name: 'Tesla Inc.',            emoji: '⚡', category: 'stock' },
    { symbol: 'AMZN',   name: 'Amazon.com',            emoji: '📦', category: 'stock' },
    { symbol: 'GOOGL',  name: 'Alphabet Inc.',         emoji: '🔍', category: 'stock' },
    { symbol: 'BTC',    name: 'Bitcoin',               emoji: '₿', category: 'crypto' },
    { symbol: 'ETH',    name: 'Ethereum',              emoji: '💎', category: 'crypto' },
    { symbol: 'BNB',    name: 'BNB',                   emoji: '🟡', category: 'crypto' },
    { symbol: 'RE_NYC', name: 'NYC Apartment',         emoji: '🏙️', category: 'realestate' },
    { symbol: 'RE_LA',  name: 'LA Property',           emoji: '🌴', category: 'realestate' },
    { symbol: 'RE_MIA', name: 'Miami Condo',           emoji: '🌊', category: 'realestate' },
  ];
  return raw.map((a) => ({ ...a, ...simulatedPrice(a.symbol) }));
}

const CATALOGUE = buildCatalogue();

const CATEGORY_LABELS: Record<string, string> = {
  stock: '📈 Stocks',
  crypto: '₿ Crypto',
  realestate: '🏠 Real Estate',
};

// ─── Learn cards ─────────────────────────────────────────────
const LEARN_CARDS = [
  {
    title: 'What is a Stock?',
    emoji: '📈',
    body:  "A stock is a tiny piece of ownership in a company. When the company does well, your piece is worth more. When it struggles, it's worth less.",
  },
  {
    title: 'What is Crypto?',
    emoji: '₿',
    body:  'Cryptocurrency is digital money secured by math (cryptography). It has no central bank — anyone can hold it. Prices can swing wildly, so only invest what you can afford to lose.',
  },
  {
    title: 'What is Diversification?',
    emoji: '🧺',
    body:  "Don't put all your eggs in one basket. Spreading investments across stocks, crypto, and real estate reduces the risk that one bad day wipes you out.",
  },
  {
    title: 'What is Real Estate Investing?',
    emoji: '🏠',
    body:  'Buying property lets you earn rental income and profit if the property value rises. It requires a lot of capital upfront but tends to be more stable than stocks.',
  },
  {
    title: 'What is Risk vs Reward?',
    emoji: '⚖️',
    body:  'Higher potential returns usually come with higher risk. Crypto can 10× — or lose 80%. Bonds are safe but grow slowly. Your age and goals determine the right balance.',
  },
  {
    title: 'What is Dollar-Cost Averaging?',
    emoji: '📅',
    body:  'Instead of investing a lump sum all at once, invest a fixed amount every week or month. This smooths out price swings and removes the pressure of "timing the market."',
  },
];

// ─── Main screen ─────────────────────────────────────────────
export default function InvestmentScreen() {
  const { selectedChild } = useAuthStore();

  const [tab,      setTab]     = useState<PortfolioTab>('portfolio');
  const [holdings, setHoldings]= useState<Holding[]>([]);
  const [balance,  setBalance] = useState(0);   // virtual coins
  const [loading,  setLoading] = useState(true);
  const [category, setCategory]= useState<'stock' | 'crypto' | 'realestate'>('stock');
  const [buyModal, setBuyModal]= useState<Asset | null>(null);
  const [qty,      setQty]     = useState('1');
  const [buying,   setBuying]  = useState(false);

  const childId = selectedChild?.id ?? null;

  const load = useCallback(async () => {
    if (!childId) { setLoading(false); return; }
    setLoading(true);
    const [balRes, holdRes] = await Promise.all([
      supabase.from('wealth_coins').select('balance').eq('child_id', childId).maybeSingle(),
      supabase.from('virtual_portfolio').select('symbol, shares, avg_cost').eq('child_id', childId),
    ]);
    setBalance(balRes.data?.balance ?? 0);
    setHoldings((holdRes.data ?? []) as Holding[]);
    setLoading(false);
  }, [childId]);

  useEffect(() => { load(); }, [load]);

  // ── Portfolio value ──────────────────────────────────────────
  const portfolioValue = holdings.reduce((sum, h) => {
    const asset = CATALOGUE.find((a) => a.symbol === h.symbol);
    return sum + (asset ? asset.price * h.shares : 0);
  }, 0);

  const costBasis = holdings.reduce((sum, h) => sum + h.avg_cost * h.shares, 0);
  const totalGain = portfolioValue - costBasis;
  const gainPct   = costBasis > 0 ? (totalGain / costBasis) * 100 : 0;

  // ── Buy handler ──────────────────────────────────────────────
  const handleBuy = async () => {
    if (!buyModal || !childId) return;
    const shares     = parseFloat(qty);
    if (isNaN(shares) || shares <= 0) {
      Alert.alert('Invalid', 'Enter a valid number of shares.');
      return;
    }
    const totalCost  = Math.round(buyModal.price * shares);
    if (totalCost > balance) {
      Alert.alert(
        'Not enough coins',
        `This costs ${totalCost.toLocaleString()} coins but you have ${balance.toLocaleString()}.`
      );
      return;
    }
    setBuying(true);
    // Debit coins
    const { error: debitErr } = await supabase
      .from('wealth_coins')
      .update({ balance: balance - totalCost })
      .eq('child_id', childId);

    if (debitErr) { Alert.alert('Error', 'Could not complete purchase.'); setBuying(false); return; }

    // Upsert holding
    const existing = holdings.find((h) => h.symbol === buyModal.symbol);
    if (existing) {
      const newShares  = existing.shares + shares;
      const newAvgCost = (existing.avg_cost * existing.shares + buyModal.price * shares) / newShares;
      await supabase
        .from('virtual_portfolio')
        .update({ shares: newShares, avg_cost: +newAvgCost.toFixed(4) })
        .eq('child_id', childId)
        .eq('symbol', buyModal.symbol);
    } else {
      await supabase.from('virtual_portfolio').insert({
        child_id: childId,
        symbol:   buyModal.symbol,
        shares,
        avg_cost: buyModal.price,
      });
    }

    // Log the transaction
    await supabase.from('wealth_coins_log').insert({
      child_id: childId,
      coins:    -totalCost,
      reason:   `Bought ${shares}× ${buyModal.symbol}`,
    });

    setBuying(false);
    setBuyModal(null);
    setQty('1');
    load();
  };

  // ── Sell handler ─────────────────────────────────────────────
  const handleSell = async (holding: Holding) => {
    if (!childId) return;
    const asset = CATALOGUE.find((a) => a.symbol === holding.symbol);
    if (!asset) return;
    const proceeds = Math.round(asset.price * holding.shares);
    Alert.alert(
      `Sell all ${holding.symbol}?`,
      `You'll receive ${proceeds.toLocaleString()} coins.\n` +
      `Gain/loss: ${proceeds > Math.round(holding.avg_cost * holding.shares) ? '+' : ''}` +
      `${(proceeds - Math.round(holding.avg_cost * holding.shares)).toLocaleString()} coins`,
      [
        {
          text: 'Sell',
          style: 'destructive',
          onPress: async () => {
            await Promise.all([
              supabase.from('virtual_portfolio')
                .delete()
                .eq('child_id', childId)
                .eq('symbol', holding.symbol),
              supabase.from('wealth_coins')
                .update({ balance: balance + proceeds })
                .eq('child_id', childId),
              supabase.from('wealth_coins_log').insert({
                child_id: childId,
                coins:    proceeds,
                reason:   `Sold ${holding.shares}× ${holding.symbol}`,
              }),
            ]);
            load();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={s.root}>

      {/* ─── Header ─────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Virtual Portfolio</Text>
          <Text style={s.headerSub}>Practice investing with WealthCoins — no real money</Text>
        </View>
        <View style={s.balancePill}>
          <Text style={s.balanceTxt}>💰 {balance.toLocaleString()}</Text>
        </View>
      </View>

      {/* ─── Tab bar ────────────────────────── */}
      <View style={s.tabBar}>
        {(['portfolio', 'market', 'learn'] as PortfolioTab[]).map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
              {t === 'portfolio' ? '📊 Portfolio' : t === 'market' ? '🌐 Market' : '📖 Learn'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#F0A500" style={{ marginTop: 60 }} />
      ) : (
        <>
          {/* ══════════ PORTFOLIO ══════════ */}
          {tab === 'portfolio' && (
            <ScrollView contentContainerStyle={s.scroll}>
              {/* Summary card */}
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Portfolio Value</Text>
                <Text style={s.summaryValue}>{Math.round(portfolioValue).toLocaleString()} coins</Text>
                <Text style={[s.summaryGain, totalGain >= 0 ? s.green : s.red]}>
                  {totalGain >= 0 ? '▲' : '▼'} {Math.abs(Math.round(totalGain)).toLocaleString()} coins  ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%)
                </Text>
              </View>

              {holdings.length === 0 ? (
                <View style={s.empty}>
                  <Text style={s.emptyEmoji}>📭</Text>
                  <Text style={s.emptyTitle}>No holdings yet</Text>
                  <Text style={s.emptyDesc}>Head to the Market tab to make your first virtual investment!</Text>
                  <TouchableOpacity style={s.goMarketBtn} onPress={() => setTab('market')}>
                    <Text style={s.goMarketTxt}>Go to Market →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                holdings.map((h) => {
                  const asset   = CATALOGUE.find((a) => a.symbol === h.symbol);
                  if (!asset) return null;
                  const curVal  = asset.price * h.shares;
                  const cost    = h.avg_cost * h.shares;
                  const gain    = curVal - cost;
                  const gainP   = cost > 0 ? (gain / cost) * 100 : 0;
                  return (
                    <View key={h.symbol} style={s.holdingCard}>
                      <Text style={s.holdingEmoji}>{asset.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={s.holdingTop}>
                          <Text style={s.holdingSymbol}>{asset.symbol}</Text>
                          <Text style={[s.holdingGain, gain >= 0 ? s.green : s.red]}>
                            {gain >= 0 ? '+' : ''}{Math.round(gain).toLocaleString()} ({gainP.toFixed(1)}%)
                          </Text>
                        </View>
                        <Text style={s.holdingDetail}>
                          {h.shares}× @ {Math.round(h.avg_cost).toLocaleString()} · Now {Math.round(curVal).toLocaleString()} coins
                        </Text>
                      </View>
                      <TouchableOpacity style={s.sellBtn} onPress={() => handleSell(h)}>
                        <Text style={s.sellTxt}>Sell</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* ══════════ MARKET ══════════ */}
          {tab === 'market' && (
            <>
              {/* Category filter */}
              <View style={s.catRow}>
                {(['stock', 'crypto', 'realestate'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.catBtn, category === c && s.catBtnActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[s.catTxt, category === c && s.catTxtActive]}>
                      {CATEGORY_LABELS[c]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView contentContainerStyle={s.scroll}>
                {CATALOGUE.filter((a) => a.category === category).map((asset) => (
                  <TouchableOpacity key={asset.symbol} style={s.assetCard} onPress={() => { setBuyModal(asset); setQty('1'); }}>
                    <Text style={s.assetEmoji}>{asset.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.assetSymbol}>{asset.symbol}</Text>
                      <Text style={s.assetName}>{asset.name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.assetPrice}>{asset.price.toLocaleString()} coins</Text>
                      <Text style={[s.assetChange, asset.change_pct >= 0 ? s.green : s.red]}>
                        {asset.change_pct >= 0 ? '▲' : '▼'} {Math.abs(asset.change_pct)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* ══════════ LEARN ══════════ */}
          {tab === 'learn' && (
            <ScrollView contentContainerStyle={s.scroll}>
              {LEARN_CARDS.map((card) => (
                <View key={card.title} style={s.learnCard}>
                  <Text style={s.learnEmoji}>{card.emoji}</Text>
                  <Text style={s.learnTitle}>{card.title}</Text>
                  <Text style={s.learnBody}>{card.body}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* ─── Buy modal ──────────────────────── */}
      {buyModal && (
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{buyModal.emoji} Buy {buyModal.symbol}</Text>
            <Text style={s.modalPrice}>{buyModal.price.toLocaleString()} coins per share</Text>

            <Text style={s.modalLabel}>Number of shares</Text>
            <TextInput
              style={s.modalInput}
              value={qty}
              onChangeText={setQty}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={s.modalTotal}>
              Total cost: {(parseFloat(qty) > 0 ? Math.round(buyModal.price * parseFloat(qty)) : 0).toLocaleString()} coins
            </Text>
            <Text style={s.modalBalance}>Your balance: {balance.toLocaleString()} coins</Text>

            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setBuyModal(null)}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={handleBuy} disabled={buying}>
                {buying
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalConfirmTxt}>Buy</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#080F1E' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
  headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  balancePill: {
    backgroundColor: 'rgba(240,165,0,0.1)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(240,165,0,0.3)',
  },
  balanceTxt: { fontSize: 13, fontWeight: '800', color: '#F0A500' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  tab:       { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#F0A500' },
  tabTxt:    { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  tabTxtActive: { color: '#F0A500', fontWeight: '800' },

  scroll:    { padding: 16, paddingBottom: 48 },

  // Summary
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18,
    padding: 22, alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 },
  summaryValue: { fontSize: 30, fontWeight: '900', color: '#fff' },
  summaryGain:  { fontSize: 14, fontWeight: '700', marginTop: 6 },

  // Holding cards
  holdingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  holdingEmoji:  { fontSize: 28 },
  holdingTop:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  holdingSymbol: { fontSize: 15, fontWeight: '800', color: '#fff' },
  holdingGain:   { fontSize: 13, fontWeight: '700' },
  holdingDetail: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  sellBtn:       { backgroundColor: 'rgba(231,76,60,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(231,76,60,0.3)' },
  sellTxt:       { color: '#E74C3C', fontWeight: '800', fontSize: 12 },

  // Empty
  empty:       { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyTitle:  { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 8 },
  emptyDesc:   { fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  goMarketBtn: { backgroundColor: '#F0A500', borderRadius: 50, paddingHorizontal: 24, paddingVertical: 12 },
  goMarketTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Category filter
  catRow: {
    flexDirection: 'row', padding: 12, gap: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  catBtn:      { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  catBtnActive:{ backgroundColor: 'rgba(240,165,0,0.15)', borderWidth: 1, borderColor: 'rgba(240,165,0,0.4)' },
  catTxt:      { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  catTxtActive:{ color: '#F0A500' },

  // Asset cards
  assetCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  assetEmoji:  { fontSize: 28 },
  assetSymbol: { fontSize: 15, fontWeight: '800', color: '#fff' },
  assetName:   { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  assetPrice:  { fontSize: 14, fontWeight: '800', color: '#fff' },
  assetChange: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  // Learn cards
  learnCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16,
    padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  learnEmoji: { fontSize: 30, marginBottom: 8 },
  learnTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 8 },
  learnBody:  { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },

  // Colours
  green: { color: '#27AE60' },
  red:   { color: '#E74C3C' },

  // Modal
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24,
  },
  modal: {
    backgroundColor: '#0D1B2A', borderRadius: 22, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle:      { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 4 },
  modalPrice:      { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 },
  modalLabel:      { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 18, fontWeight: '800', color: '#fff',
    marginBottom: 12,
  },
  modalTotal:      { fontSize: 15, fontWeight: '800', color: '#F0A500', marginBottom: 4 },
  modalBalance:    { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 },
  modalBtnRow:     { flexDirection: 'row', gap: 12 },
  modalCancel:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 50, paddingVertical: 14, alignItems: 'center' },
  modalCancelTxt:  { color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  modalConfirm:    { flex: 1, backgroundColor: '#27AE60', borderRadius: 50, paddingVertical: 14, alignItems: 'center' },
  modalConfirmTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
