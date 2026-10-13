import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import RealisticHandViewer, { RealisticHandViewerRef } from '@/components/RealisticHandViewer';
import {
  ISL_ALPHABET_DATA,
  getISLSignById,
  ISLSignDefinition,
} from '@/services/islAlphabetPoses';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function Learn3D() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ initial?: string }>();
  
  const [selectedLetter, setSelectedLetter] = useState<string>(
    (params.initial && params.initial.toUpperCase()) || 'A'
  );
  const [bonesCount, setBonesCount] = useState<number | null>(null);
  const viewerRef = useRef<RealisticHandViewerRef>(null);

  const currentSign: ISLSignDefinition =
    getISLSignById(selectedLetter) || ISL_ALPHABET_DATA[0];

  const currentIndex = ISL_ALPHABET_DATA.findIndex(s => s.id === currentSign.id);
  const prevSign = currentIndex > 0 ? ISL_ALPHABET_DATA[currentIndex - 1] : null;
  const nextSign =
    currentIndex < ISL_ALPHABET_DATA.length - 1
      ? ISL_ALPHABET_DATA[currentIndex + 1]
      : null;

  const handleSelectLetter = (id: string) => {
    setSelectedLetter(id);
  };

  const handlePrevious = () => {
    if (prevSign) {
      setSelectedLetter(prevSign.id);
    }
  };

  const handleNext = () => {
    if (nextSign) {
      setSelectedLetter(nextSign.id);
    }
  };

  return (
    <Screen edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>
            ISL 3D Sign Studio
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {bonesCount ? `${bonesCount} Bones Rigged • Authentic ISL` : 'Interactive 3D Hand'}
          </Text>
        </View>

        <Pressable
          onPress={() => viewerRef.current?.resetCamera()}
          style={[styles.resetBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          accessibilityLabel="Reset 3D camera"
        >
          <Ionicons name="scan-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Alphabet Horizontal Scroller */}
        <View style={styles.scrollerContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.letterScrollContent}
          >
            {ISL_ALPHABET_DATA.map(sign => {
              const isSelected = sign.id === currentSign.id;
              return (
                <Pressable
                  key={sign.id}
                  onPress={() => handleSelectLetter(sign.id)}
                  style={[
                    styles.letterPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityLabel={`Sign ${sign.id}`}
                >
                  <Text
                    style={[
                      styles.letterPillText,
                      { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {sign.id}
                  </Text>
                  {sign.isDynamic && (
                    <View
                      style={[
                        styles.dotDynamic,
                        { backgroundColor: isSelected ? '#FFFFFF' : colors.primary },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 3D Hand Viewer Card */}
        <View style={[styles.viewerWrapper, { borderColor: colors.border }]}>
          <RealisticHandViewer
            ref={viewerRef}
            pose={currentSign.pose}
            isDynamic={currentSign.isDynamic}
            dynamicPath={currentSign.dynamicPath}
            signLabel={currentSign.label}
            onModelLoaded={count => setBonesCount(count)}
            showControls={true}
          />
        </View>

        {/* Navigation & Sign Info Bar */}
        <View style={styles.navRow}>
          <Pressable
            onPress={handlePrevious}
            disabled={!prevSign}
            style={[
              styles.navBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: prevSign ? 1 : 0.4,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>
              {prevSign ? prevSign.id : '—'}
            </Text>
          </Pressable>

          <View style={styles.currentLetterBadge}>
            <Text style={styles.currentLetterChar}>{currentSign.id}</Text>
          </View>

          <Pressable
            onPress={handleNext}
            disabled={!nextSign}
            style={[
              styles.navBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: nextSign ? 1 : 0.4,
              },
            ]}
          >
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>
              {nextSign ? nextSign.id : '—'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Sign Details Card */}
        <Card style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.h2, { color: colors.textPrimary }]}>
                {currentSign.name}
              </Text>
              <Text
                style={[
                  typography.body,
                  { color: colors.textSecondary, marginTop: 4, lineHeight: 22 },
                ]}
              >
                {currentSign.description}
              </Text>
            </View>
            {currentSign.isDynamic && (
              <View style={[styles.dynamicPill, { backgroundColor: 'rgba(244, 91, 22, 0.15)' }]}>
                <Ionicons name="pulse" size={14} color={colors.primary} />
                <Text style={[styles.dynamicPillText, { color: colors.primary }]}>Dynamic</Text>
              </View>
            )}
          </View>

          {/* Instructions List */}
          <View style={styles.sectionWrap}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: 8 }]}>
              How to form this sign:
            </Text>
            {currentSign.instructions.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[styles.stepNumberText, { color: colors.primary }]}>
                    {idx + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    typography.body,
                    { color: colors.textPrimary, flex: 1, lineHeight: 20 },
                  ]}
                >
                  {step}
                </Text>
              </View>
            ))}
          </View>

          {/* Tip Box */}
          {currentSign.tips ? (
            <View
              style={[
                styles.tipBox,
                { backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.3)' },
              ]}
            >
              <Ionicons name="bulb-outline" size={18} color="#3B82F6" />
              <Text style={styles.tipText}>
                <Text style={{ fontWeight: '700', color: '#3B82F6' }}>Pro Tip: </Text>
                {currentSign.tips}
              </Text>
            </View>
          ) : null}

          {/* Action Row */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => router.push('/(tabs)/recognize')}
              style={[styles.cameraPracticeBtn, { backgroundColor: colors.primary }]}
              accessibilityLabel="Practice with AI Camera"
            >
              <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
              <Text style={styles.cameraPracticeText}>Practice Sign {currentSign.id} with Camera</Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  resetBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollerContainer: {
    marginVertical: spacing.sm,
  },
  letterScrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  letterPill: {
    width: 42,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  letterPillText: {
    fontSize: 18,
    fontWeight: '700',
  },
  dotDynamic: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 5,
  },
  viewerWrapper: {
    width: '100%',
    height: 340,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.md,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  currentLetterBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F45B16',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F45B16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  currentLetterChar: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  detailCard: {
    marginTop: spacing.xs,
    padding: spacing.lg,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dynamicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dynamicPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionWrap: {
    marginTop: spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#1E293B',
  },
  actionRow: {
    marginTop: spacing.xl,
  },
  cameraPracticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  cameraPracticeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
