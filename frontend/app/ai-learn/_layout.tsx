/**
 * Layout for the AI-Powered ISL Learning Module.
 * NEW FILE — Stack navigator wrapping all AI learning routes.
 */
import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { LearningProvider } from '@/context/LearningContext';

export default function AILearnLayout() {
  const { colors } = useTheme();

  return (
    <LearningProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'AI ISL Learning',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="assessment"
          options={{
            title: 'ISL Skill Assessment',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="lesson"
          options={{
            title: 'Interactive Lesson',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="quiz"
          options={{
            title: 'ISL Mastery Quiz',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="progress"
          options={{
            title: 'Learning Analytics',
            headerShown: true,
          }}
        />
      </Stack>
    </LearningProvider>
  );
}
