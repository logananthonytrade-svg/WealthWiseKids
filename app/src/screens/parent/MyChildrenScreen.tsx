import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import useAuthStore, { type ChildProfile } from '../../store/authStore';
import { ParentStackParamList } from '../../navigation/ParentNavigator';

const AVATARS = ['🦁', '🐯', '🦊', '🐼', '🐨', '🦋', '🐬', '🦅', '🦉', '🐉'];

export default function MyChildrenScreen() {
  const navigation   = useNavigation<StackNavigationProp<ParentStackParamList>>();
  const { children, user, setSelectedChild, loadChildren } = useAuthStore();

  useEffect(() => {
    if (user) loadChildren(user.id);
  }, []);

  const handleSelectChild = (child: any) => {
    setSelectedChild(child);
    // Navigation is handled automatically by App.tsx watching selectedChild
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Children</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CreateChildProfile')}
        >
          <Text style={styles.addBtnText}>+ Add Child</Text>
        </TouchableOpacity>
      </View>

      {children.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👶</Text>
          <Text style={styles.emptyTitle}>No children yet</Text>
          <Text style={styles.emptyDesc}>Add your first child to get started.</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('CreateChildProfile')}
          >
            <Text style={styles.primaryBtnText}>Add First Child</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={children}
          keyExtractor={(c: ChildProfile) => c.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item: child }: { item: ChildProfile }) => {
            const avatar = AVATARS[(child.avatar_choice ?? 1) - 1];
            return (
              <TouchableOpacity
                style={styles.childCard}
                onPress={() => handleSelectChild(child)}
                activeOpacity={0.8}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarEmoji}>{avatar}</Text>
                </View>
                <Text style={styles.childName}>{child.name}</Text>
                <Text style={styles.viewBtn}>View Learning →</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title:   { fontSize: 22, fontWeight: '800', color: '#1B3A6B' },
  addBtn:  { backgroundColor: '#1B3A6B', borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  grid: { padding: 16, gap: 12 },
  childCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 20,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#E8F0FB', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, borderWidth: 2, borderColor: '#1B3A6B',
  },
  avatarEmoji: { fontSize: 36 },
  childName: { fontSize: 16, fontWeight: '800', color: '#1B3A6B', marginBottom: 4 },
  viewBtn: { fontSize: 12, color: '#27AE60', fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#1B3A6B', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 },
  primaryBtn: { backgroundColor: '#1B3A6B', borderRadius: 50, paddingVertical: 14, paddingHorizontal: 32 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
