import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Screen } from '@/components/Screen';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { loadHistory, clearHistory, HistoryEntry } from '@/services/storage';

export default function History() {
  const { colors } = useTheme();
  const [items, setItems] = useState<HistoryEntry[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadHistory().then(setItems);
    }, []),
  );
  
  
  
  if (items.length === 0) {
    return (
      <Screen edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="time-outline" size={56} color={colors.textMuted} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing.lg }]}>
            No history yet
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            Recognized signs will appear here.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <View style={{ padding: spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[typography.h1, { color: colors.textPrimary }]}>History</Text>
        <Pressable onPress={() => clearHistory().then(() => setItems([]))} hitSlop={12}>
          <Ionicons name="trash-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl }}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[typography.h3, { color: colors.textPrimary }]}>{item.sign}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
              {(item.confidence * 100).toFixed(0)}% • {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
});