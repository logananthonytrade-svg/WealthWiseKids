import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';

import MyChildrenScreen from '../screens/parent/MyChildrenScreen';
import ParentReportsScreen from '../screens/parent/ParentReportsScreen';
import ParentSettingsScreen from '../screens/parent/ParentSettingsScreen';
import CreateChildProfileScreen from '../screens/auth/CreateChildProfileScreen';

export type ParentTabParamList = {
  MyChildren: undefined;
  Reports: undefined;
  Settings: undefined;
};

export type ParentStackParamList = {
  ParentTabs: undefined;
  CreateChildProfile: undefined;
};

const Tab = createBottomTabNavigator<ParentTabParamList>();
const Stack = createStackNavigator<ParentStackParamList>();

function ParentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1B3A6B',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee' },
        tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => {
          const icons: Record<string, string> = {
            MyChildren: focused ? 'people' : 'people-outline',
            Reports: focused ? 'bar-chart' : 'bar-chart-outline',
            Settings: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={icons[route.name] as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="MyChildren" component={MyChildrenScreen} options={{ title: 'My Children' }} />
      <Tab.Screen name="Reports" component={ParentReportsScreen} />
      <Tab.Screen name="Settings" component={ParentSettingsScreen} />
    </Tab.Navigator>
  );
}

export default function ParentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ParentTabs" component={ParentTabs} />
      <Stack.Screen name="CreateChildProfile" component={CreateChildProfileScreen} />
    </Stack.Navigator>
  );
}
