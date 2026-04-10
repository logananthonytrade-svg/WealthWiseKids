import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
} from 'react-native';
import useAuthStore from '../../store/authStore';

const AVATARS = ['🦁', '🐯', '🦊', '🐼', '🐨', '🦋', '🐬', '🦅', '🦉', '🐉'];

export default function ProfileScreen() {
  const { selectedChild, setSelectedChild } = useAuthStore();

  const avatar = AVATARS[(selectedChild?.avatar_choice ?? 1) - 1];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{avatar}</Text>
        </View>

        <Text style={styles.name}>{selectedChild?.name}</Text>

        {/* Back to parent */}
        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => setSelectedChild(null)}
          activeOpacity={0.8}
        >
          <Text style={styles.switchBtnText}>← Switch Child / Parent Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  content:   { flex: 1, alignItems: 'center', paddingTop: 60 },
  avatarCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#E8F0FB',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 3, borderColor: '#1B3A6B',
  },
  avatarEmoji: { fontSize: 52 },
  name: { fontSize: 24, fontWeight: '800', color: '#1B3A6B', marginBottom: 40 },
  switchBtn: {
    borderWidth: 2, borderColor: '#1B3A6B', borderRadius: 50,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  switchBtnText: { color: '#1B3A6B', fontWeight: '700', fontSize: 14 },
});
