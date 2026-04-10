import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import SchoolsScreen from '../screens/student/SchoolsScreen';
import ProgressScreen from '../screens/student/ProgressScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import LessonViewerScreen from '../screens/student/LessonViewerScreen';
import QuizIntroScreen from '../screens/student/QuizIntroScreen';
import QuizScreen from '../screens/student/QuizScreen';
import QuizResultsScreen from '../screens/student/QuizResultsScreen';
import SpendingReportsScreen from '../screens/student/SpendingReportsScreen';
import ConnectBankScreen from '../screens/student/ConnectBankScreen';
import UpgradeScreen from '../screens/paywall/UpgradeScreen';


export type StudentTabParamList = {
  Schools: undefined;
  Budget: undefined;
  Progress: undefined;
  Profile: undefined;
};

export type StudentStackParamList = {
  StudentTabs: undefined;
  LessonViewer: { schoolId: number; schoolTitle: string };
  QuizIntro: { schoolId: number; schoolTitle: string; lessonCount: number };
  Quiz: { schoolId: number };
  QuizResults: {
    schoolId: number;
    schoolTitle: string;
    score: number;
    passed: boolean;
    answers: Array<{ questionId: string; selectedAnswer: string; wasCorrect: boolean }>;
  };
  ConnectBank: undefined;
  Upgrade: undefined;
};

const Tab = createBottomTabNavigator<StudentTabParamList>();
const Stack = createStackNavigator<StudentStackParamList>();

function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1B3A6B',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee' },
        tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => {
          const icons: Record<string, string> = {
            Schools: focused ? 'school' : 'school-outline',
            Budget: focused ? 'wallet' : 'wallet-outline',
            Progress: focused ? 'trophy' : 'trophy-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Schools" component={SchoolsScreen} />
      <Tab.Screen name="Budget" component={SpendingReportsScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function StudentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentTabs" component={StudentTabs} />
      <Stack.Screen name="LessonViewer" component={LessonViewerScreen} />
      <Stack.Screen name="QuizIntro" component={QuizIntroScreen} />
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="QuizResults" component={QuizResultsScreen} />
      <Stack.Screen name="ConnectBank" component={ConnectBankScreen} />
      <Stack.Screen name="Upgrade" component={UpgradeScreen} />
    </Stack.Navigator>
  );
}
