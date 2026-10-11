import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Screen } from '@/components/Screen';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type Row =
  | { type: 'header'; title: string }
  | { type: 'item'; label: string };

const ALPHABETS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function Learn() {
  const { colors } = useTheme();
  const router = useRouter();

  const data: Row[] = [
    { type: 'header', title: 'Alphabets' },
    ...ALPHABETS.map<Row>((c) => ({ type: 'item', label: c })),
    { type: 'header', title: 'Numbers' },
    ...NUMBERS.map<Row>((c) => ({ type: 'item', label: c })),
  ];

  return (
    <Screen edges={['top']}>
      <View style={{ padding: spacing.xl, paddingBottom: spacing.md }}>
        <Text style={[typography.h1, { color: colors.textPrimary }]}>Learn</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
          Tap any sign to see how it’s formed
        </Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item, i) => `${item.type}-${i}`}
        numColumns={4}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl }}
        columnWrapperStyle={{ gap: spacing.md, marginBottom: spacing.md }}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={{ width: '100%', paddingVertical: spacing.md }}>
                <Text style={[typography.h3, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>
              </View>
            );
          }
          return (
            <Pressable
              onPress={() => router.push(`/lesson/${item.label}`)}
              style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}
              accessibilityLabel={`Sign for ${item.label}`}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700' }}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});