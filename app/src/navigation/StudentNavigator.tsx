import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import SwipeLayout          from '../screens/student/SwipeLayout';
import LessonViewerScreen   from '../screens/student/LessonViewerScreen';
import ChapterQuizScreen    from '../screens/student/ChapterQuizScreen';
import QuizIntroScreen      from '../screens/student/QuizIntroScreen';
import QuizScreen           from '../screens/student/QuizScreen';
import QuizResultsScreen    from '../screens/student/QuizResultsScreen';
import SpendingReportsScreen from '../screens/student/SpendingReportsScreen';
import ConnectBankScreen    from '../screens/student/ConnectBankScreen';
import UpgradeScreen        from '../screens/paywall/UpgradeScreen';
import ProfileScreen        from '../screens/student/ProfileScreen';
import ProgressScreen       from '../screens/student/ProgressScreen';
import InvestmentScreen     from '../screens/student/InvestmentScreen';

export type StudentStackParamList = {
  SwipeHome:       undefined;
  LessonViewer:    { schoolId: number; schoolTitle: string };
  ChapterQuiz: {
    schoolId:     number;
    schoolTitle:  string;
    lessonId:     string;
    lessonTitle:  string;
    lessonNumber: number;
    totalLessons: number;
    isLastLesson: boolean;
  };
  QuizIntro:       { schoolId: number; schoolTitle: string; lessonCount: number };
  Quiz:            { schoolId: number };
  QuizResults: {
    schoolId:  number;
    schoolTitle: string;
    score:     number;
    passed:    boolean;
    answers:   Array<{ questionId: string; selectedAnswer: string; wasCorrect: boolean }>;
  };
  SpendingReports: undefined;
  ConnectBank:     undefined;
  Upgrade:         undefined;
  Profile:         undefined;
  Progress:        undefined;
  Investments:     undefined;
};

const Stack = createStackNavigator<StudentStackParamList>();

export default function StudentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SwipeHome"       component={SwipeLayout} />
      <Stack.Screen name="LessonViewer"    component={LessonViewerScreen} />
      <Stack.Screen name="ChapterQuiz"     component={ChapterQuizScreen} />
      <Stack.Screen name="QuizIntro"       component={QuizIntroScreen} />
      <Stack.Screen name="Quiz"            component={QuizScreen} />
      <Stack.Screen name="QuizResults"     component={QuizResultsScreen} />
      <Stack.Screen name="SpendingReports" component={SpendingReportsScreen} />
      <Stack.Screen name="ConnectBank"     component={ConnectBankScreen} />
      <Stack.Screen name="Upgrade"         component={UpgradeScreen} />
      <Stack.Screen name="Profile"         component={ProfileScreen} />
      <Stack.Screen name="Progress"        component={ProgressScreen} />
      <Stack.Screen name="Investments"     component={InvestmentScreen} />
    </Stack.Navigator>
  );
}
