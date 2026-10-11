import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage, LANGUAGES } from '@/context/LanguageContext';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Ionicons } from '@expo/vector-icons';

const THEME_OPTIONS = [
  { key: 'system', label: 'System default', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
] as const;

export default function Settings() {
  const { colors, preference, setPreference } = useTheme();
  const { language, setLanguage } = useLanguage();

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}>
        <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.md }]}>
          Appearance
        </Text>
        <Card>
          {THEME_OPTIONS.map((opt, i) => {
            const active = preference === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setPreference(opt.key)}
                style={[
                  styles.row,
                  i !== THEME_OPTIONS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Ionicons name={opt.icon as never} size={20} color={colors.textPrimary} />
                <Text style={[typography.body, { color: colors.textPrimary, flex: 1, marginLeft: spacing.md }]}>
                  {opt.label}
                </Text>
                {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
            );
          })}
        </Card>

        <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.md }]}>
          Language
        </Text>
        <Card>
          {LANGUAGES.map((lang, i) => {
            const active = language.code === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => setLanguage(lang.code)}
                style={[
                  styles.row,
                  i !== LANGUAGES.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1 }]}>
                  {lang.native}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginRight: spacing.md }]}>
                  {lang.name}
                </Text>
                {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
});