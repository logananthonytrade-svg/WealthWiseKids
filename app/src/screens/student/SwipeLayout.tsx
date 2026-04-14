import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions,
  SafeAreaView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import StoreScreen    from './StoreScreen';
import LessonHubPane  from './LessonHubPane';
import ResourcesPane  from './ResourcesPane';

const { width: W } = Dimensions.get('window');

type PageMeta = { label: string; icon: keyof typeof Ionicons.glyphMap };

const PAGES: PageMeta[] = [
  { label: 'Store', icon: 'bag-outline'       },
  { label: 'Home',  icon: 'school-outline'     },
  { label: 'Tools', icon: 'construct-outline'  },
];

export default function SwipeLayout() {
  const scrollRef                     = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx]     = useState(1);
  const [paneH, setPaneH]             = useState(Dimensions.get('window').height);

  // Start scrolled to center pane (index 1 = Home)
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollTo({ x: W, animated: false }), 60);
    return () => clearTimeout(t);
  }, []);

  const onMomentumEnd = (e: any) => {
    setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / W));
  };

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * W, animated: true });
    setActiveIdx(i);
  };

  return (
    <SafeAreaView style={s.safe}>

      {/* ─── Top bar ────────────────────────────────────────── */}
      <View style={s.topBar}>

        {/* Left hint — screen to the left */}
        {activeIdx > 0 ? (
          <TouchableOpacity onPress={() => goTo(activeIdx - 1)} style={s.hint}>
            <Ionicons name="chevron-back" size={14} color="rgba(255,255,255,0.45)" />
            <Text style={s.hintTxt}>{PAGES[activeIdx - 1].label}</Text>
          </TouchableOpacity>
        ) : <View style={s.hint} />}

        {/* Centre title */}
        <View style={s.titleWrap}>
          <Ionicons name={PAGES[activeIdx].icon} size={13} color="#F0A500" />
          <Text style={s.topTitle}>{PAGES[activeIdx].label}</Text>
        </View>

        {/* Right hint — screen to the right */}
        {activeIdx < 2 ? (
          <TouchableOpacity onPress={() => goTo(activeIdx + 1)} style={[s.hint, s.hintRight]}>
            <Text style={s.hintTxt}>{PAGES[activeIdx + 1].label}</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.45)" />
          </TouchableOpacity>
        ) : <View style={s.hint} />}
      </View>

      {/* ─── Pager body ─────────────────────────────────────── */}
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setPaneH(e.nativeEvent.layout.height)}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          scrollEventThrottle={16}
          decelerationRate="fast"
          bounces={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ width: W * 3 }}
        >
          <View style={{ width: W, height: paneH }}><StoreScreen /></View>
          <View style={{ width: W, height: paneH }}><LessonHubPane /></View>
          <View style={{ width: W, height: paneH }}><ResourcesPane /></View>
        </ScrollView>
      </View>

      {/* ─── Page indicator ─────────────────────────────────── */}
      <View style={s.dotsRow}>
        {PAGES.map((page, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => goTo(i)}
            hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
          >
            {i === activeIdx ? (
              <View style={s.dotPill}>
                <Ionicons name={page.icon} size={11} color="#fff" />
                <Text style={s.dotLabel}>{page.label}</Text>
              </View>
            ) : (
              <View style={s.dot} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080F1E' },

  // ── Top bar ─────────────────────────────────────────────────
  topBar: {
    height: 44, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, backgroundColor: '#080F1E',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  hint:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  hintRight: { justifyContent: 'flex-end' },
  hintTxt:   { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topTitle:  { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  // ── Dots / page indicator ────────────────────────────────────
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, height: 46, backgroundColor: '#080F1E',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
  },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0A500', borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 6,
  },
  dotLabel: { fontSize: 11, fontWeight: '800', color: '#fff' },
});
