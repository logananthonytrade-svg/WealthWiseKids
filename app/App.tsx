import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Text, View } from 'react-native';

// TODO (Phase 2) — replace with full auth/navigation shell
// Use Claude Prompt P1 from app.txt to generate src/lib/supabase.ts,
// src/store/authStore.ts, and the real App.tsx with navigators.
export default function App() {
  return (
    <NavigationContainer>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1B3A6B' }}>
        <Text style={{ color: '#F0A500', fontSize: 28, fontWeight: 'bold' }}>💰 WealthWise Kids</Text>
        <Text style={{ color: '#ffffff', marginTop: 12 }}>Financial Intelligence. Built Early.</Text>
      </View>
    </NavigationContainer>
  );
}
