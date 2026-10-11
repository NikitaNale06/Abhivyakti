import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { PredictionResult } from '@/services/api';

export default function Result() {
  const { colors } = useTheme();
  const router = useRouter();
  const { payload } = useLocalSearchParams<{ payload: string }>();
  const result: PredictionResult = JSON.parse(payload ?? '{}');

  if (result.status === 'not_ready' || result.status === 'error') {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={[typography.h2, { color: colors.textPrimary }]}>
            {result.status === 'not_ready' ? 'Model not ready' : 'Something went wrong'}
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
            ]}
          >
            {result.message ?? 'Please try again later.'}
          </Text>
          <View style={{ marginTop: spacing.xl }}>
            <Button label="Try Again" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  const isChar = result.sign ? result.sign.length === 1 : false;
  const badgeLabel = isChar ? 'Alphabet / Number' : 'Word';
  const confidence = result.confidence ?? 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
        <View style={[styles.badge, { backgroundColor: colors.primarySoft, alignSelf: 'flex-start' }]}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
            {badgeLabel}
          </Text>
        </View>

        <Text
          style={[
            typography.display,
            { color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' },
          ]}
        >
          {result.sign}
        </Text>

        <View style={[styles.confidenceRow, { marginTop: spacing.lg }]}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Confidence</Text>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>
            {(confidence * 100).toFixed(1)}%
          </Text>
        </View>
        <View style={[styles.bar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.round(confidence * 100)}%`,
                backgroundColor: result.accepted ? colors.success : colors.warning,
              },
            ]}
          />
        </View>

        {!result.accepted && (
          <Text style={[typography.caption, { color: colors.warning, marginTop: spacing.sm }]}>
            Low confidence — try again with clearer framing.
          </Text>
        )}

        {result.alternatives && result.alternatives.length > 0 && (
          <View style={{ marginTop: spacing.xl }}>
            <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.md }]}>
              Other possibilities
            </Text>
            {result.alternatives.map((a, i) => (
              <View key={i} style={{ marginBottom: spacing.sm }}>
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>
                      {a.sign}
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary }]}>
                      {(a.confidence * 100).toFixed(1)}%
                    </Text>
                  </View>
                </Card>
              </View>
            ))}
          </View>
        )}

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <Button label="Try Another" variant="secondary" onPress={() => router.back()} fullWidth />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
});