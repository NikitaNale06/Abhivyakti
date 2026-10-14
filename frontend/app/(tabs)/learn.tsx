import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { ALPHABET_IMAGES } from '@/assets/signImages';

const ALPHABETS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

type ViewMode = 'all' | 'alphabets' | 'numbers';

export default function Learn() {
  const { colors } = useTheme();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleOpen3D = (num: string = '1') => {
    router.push({
      pathname: '/learn-3d',
      params: { initial: num },
    });
  };

  const handleOpenLetterLesson = (letter: string) => {
    router.push(`/lesson/${letter}`);
  };

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Text style={[typography.h2, { color: colors.textPrimary }]}>Learn ISL</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Indian Sign Language Curriculum
            </Text>
          </View>

          <Pressable
            onPress={() => handleOpen3D('1')}
            style={[styles.studioBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Open 3D Numbers Studio"
          >
            <Ionicons name="cube" size={16} color="#FFFFFF" />
            <Text style={styles.studioBtnText}>3D 1–9</Text>
          </Pressable>
        </View>

        {/* Top Category Switcher Tabs - Guarantees Numbers & Alphabets are immediately accessible */}
        <View
          style={[
            styles.segmentContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Pressable
            onPress={() => setViewMode('all')}
            style={[
              styles.segmentBtn,
              viewMode === 'all' && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.segmentBtnText,
                { color: viewMode === 'all' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              All Signs
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setViewMode('alphabets')}
            style={[
              styles.segmentBtn,
              viewMode === 'alphabets' && { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons
              name="image-outline"
              size={14}
              color={viewMode === 'alphabets' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: viewMode === 'alphabets' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              A–Z (Images)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setViewMode('numbers')}
            style={[
              styles.segmentBtn,
              viewMode === 'numbers' && { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons
              name="cube"
              size={14}
              color={viewMode === 'numbers' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: viewMode === 'numbers' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              1–9 (3D Model)
            </Text>
          </Pressable>
        </View>

        {/* Quick Overview Cards - Both are visible side-by-side right at the top */}
        <View style={styles.quickCardsRow}>
          {/* Card 1: Alphabets (Images) */}
          <Pressable
            onPress={() => setViewMode('alphabets')}
            style={[
              styles.quickCard,
              {
                backgroundColor: colors.surface,
                borderColor: viewMode === 'alphabets' ? colors.primary : colors.border,
                borderWidth: viewMode === 'alphabets' ? 2 : 1,
              },
            ]}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
              <Ionicons name="image" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>
              Alphabets A–Z
            </Text>
            <Text style={[styles.quickCardSub, { color: colors.textSecondary }]}>
              26 Reference Images
            </Text>
          </Pressable>

          {/* Card 2: Numbers (3D Model) */}
          <Pressable
            onPress={() => setViewMode('numbers')}
            style={[
              styles.quickCard,
              {
                backgroundColor: colors.surface,
                borderColor: viewMode === 'numbers' ? colors.primary : colors.border,
                borderWidth: viewMode === 'numbers' ? 2 : 1,
              },
            ]}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(244, 91, 22, 0.12)' }]}>
              <Ionicons name="cube" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>
              Numbers 1–9
            </Text>
            <Text style={[styles.quickCardSub, { color: colors.textSecondary }]}>
              Interactive 3D Model
            </Text>
          </Pressable>
        </View>

        {/* NUMBERS SECTION (Displayed prominently when mode is 'numbers' or 'all') */}
        {(viewMode === 'numbers' || viewMode === 'all') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <View>
                <View style={styles.titleWithIcon}>
                  <Ionicons name="cube" size={20} color={colors.primary} />
                  <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: 6 }]}>
                    Numbers (1–9)
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Interactive 3D Hand Model • Tap to rotate in 360°
                </Text>
              </View>
              <Pressable
                onPress={() => handleOpen3D('1')}
                style={[
                  styles.countBadge,
                  { backgroundColor: colors.surface, borderColor: colors.primary },
                ]}
              >
                <Ionicons name="scan-outline" size={13} color={colors.primary} />
                <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                  Launch 3D
                </Text>
              </Pressable>
            </View>

            {/* 3D Numbers Grid */}
            <View style={styles.grid}>
              {NUMBERS.map((num) => (
                <Pressable
                  key={num}
                  onPress={() => handleOpen3D(num)}
                  style={[
                    styles.numberTile,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  accessibilityLabel={`Learn sign for number ${num} in 3D`}
                >
                  <Text style={[styles.numberLetter, { color: colors.textPrimary }]}>{num}</Text>
                  <View style={[styles.numberFooter, { backgroundColor: 'rgba(244, 91, 22, 0.1)' }]}>
                    <Ionicons name="cube" size={11} color={colors.primary} />
                    <Text style={[styles.numberFooterText, { color: colors.primary }]}>3D</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ALPHABETS SECTION (Displayed when mode is 'alphabets' or 'all') */}
        {(viewMode === 'alphabets' || viewMode === 'all') && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <View>
                <View style={styles.titleWithIcon}>
                  <Ionicons name="image" size={20} color="#3B82F6" />
                  <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: 6 }]}>
                    Alphabets (A–Z)
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Authentic ISL photos from assets • Tap letter to view lesson
                </Text>
              </View>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                <Text style={[styles.countBadgeText, { color: colors.textSecondary }]}>
                  26 Signs
                </Text>
              </View>
            </View>

            {/* Alphabets Grid */}
            <View style={styles.grid}>
              {ALPHABETS.map((letter) => {
                const imgSource = ALPHABET_IMAGES[letter];
                return (
                  <Pressable
                    key={letter}
                    onPress={() => handleOpenLetterLesson(letter)}
                    style={[
                      styles.alphaTile,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    accessibilityLabel={`Learn ISL sign for letter ${letter}`}
                  >
                    <View style={[styles.alphaImageContainer, { backgroundColor: '#F8FAFC' }]}>
                      {imgSource ? (
                        <Image
                          source={imgSource}
                          style={styles.alphaImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
                      )}
                    </View>

                    {/* Letter Overlay Badge */}
                    <View style={[styles.alphaBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.alphaBadgeText}>{letter}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Verified Standard Info Card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="shield-checkmark-outline" size={24} color="#10B981" />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>
              Authentic ISL Standards
            </Text>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
              ]}
            >
              Alphabets (A–Z) feature authentic Indian Sign Language reference photographs, and numbers (1–9) feature our interactive 3D bone-rigged hand model.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: spacing.md,
  },
  studioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 6,
  },
  studioBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 3,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: radius.md,
    gap: 5,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickCardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  quickCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
  },
  quickIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionWrap: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  alphaTile: {
    width: '22.8%',
    aspectRatio: 0.88,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  alphaImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  alphaImage: {
    width: '100%',
    height: '100%',
  },
  alphaBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  alphaBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  numberTile: {
    width: '31%',
    aspectRatio: 1.15,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 6,
  },
  numberLetter: {
    fontSize: 28,
    fontWeight: '800',
  },
  numberFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  numberFooterText: {
    fontSize: 10,
    fontWeight: '800',
  },
  infoCard: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.xl,
  },
});