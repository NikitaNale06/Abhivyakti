import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { getAlphabetImage } from '@/assets/signImages';
import {
  ISL_ALPHABET_DATA,
  getISLSignById,
  ISLSignDefinition,
} from '@/services/islAlphabetPoses';

const NUMBERS_LIST = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function LessonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const rawId = (id && id.toString()) || 'A';
  const cleanId = rawId.toUpperCase();

  // If the user requested a number (1-9), redirect to the 3D model studio per requirement
  React.useEffect(() => {
    if (/^[1-9]$/.test(cleanId)) {
      router.replace({
        pathname: '/learn-3d',
        params: { initial: cleanId },
      });
    }
  }, [cleanId, router]);

  if (/^[1-9]$/.test(cleanId)) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const signData: ISLSignDefinition | undefined = getISLSignById(cleanId);
  const signImage = getAlphabetImage(cleanId);

  // Alphabet list navigation
  const currentIndex = ISL_ALPHABET_DATA.findIndex((s) => s.id === cleanId);
  const prevSign = currentIndex > 0 ? ISL_ALPHABET_DATA[currentIndex - 1] : null;
  const nextSign =
    currentIndex >= 0 && currentIndex < ISL_ALPHABET_DATA.length - 1
      ? ISL_ALPHABET_DATA[currentIndex + 1]
      : null;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/learn');
    }
  };

  const handleNavigateSign = (targetId: string) => {
    router.replace(`/lesson/${targetId}`);
  };

  const handleSwitchToNumbers3D = (targetNum: string = '1') => {
    router.push({
      pathname: '/learn-3d',
      params: { initial: targetNum },
    });
  };

  const isTwoHand = signData?.handsRequired === 'two';

  return (
    <Screen edges={['top']}>
      {/* Top Header with Back Button */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          accessibilityLabel="Back to Learn"
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>
            Letter {cleanId}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Indian Sign Language (ISL)
          </Text>
        </View>

        <View
          style={[
            styles.indexBadge,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
            {currentIndex >= 0 ? `${currentIndex + 1}/26` : cleanId}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Prominent Mode Switcher: Option to switch between Alphabets (Images) & Numbers (3D Model) */}
        <View
          style={[
            styles.modeSwitchWrap,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.modeSwitchActive, { backgroundColor: colors.primary }]}>
            <Ionicons name="image" size={14} color="#FFFFFF" />
            <Text style={styles.modeSwitchActiveText}>Alphabets (Images)</Text>
          </View>

          <Pressable
            onPress={() => handleSwitchToNumbers3D('1')}
            style={styles.modeSwitchInactive}
            accessibilityLabel="Switch to Numbers 3D Model"
          >
            <Ionicons name="cube" size={14} color={colors.primary} />
            <Text style={[styles.modeSwitchInactiveText, { color: colors.primary }]}>
              Switch to Numbers (3D)
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>

        {/* Main Reference Image Card */}
        <Card style={styles.imageCard}>
          <View style={styles.imageCardHeader}>
            <View style={[styles.letterPill, { backgroundColor: colors.primary }]}>
              <Text style={styles.letterPillText}>{cleanId}</Text>
            </View>

            <View style={styles.tagRow}>
              <View
                style={[
                  styles.tag,
                  {
                    backgroundColor: isTwoHand
                      ? 'rgba(244, 91, 22, 0.12)'
                      : 'rgba(16, 185, 129, 0.12)',
                  },
                ]}
              >
                <Ionicons
                  name={isTwoHand ? 'hand-right-outline' : 'hand-left-outline'}
                  size={13}
                  color={isTwoHand ? colors.primary : '#10B981'}
                />
                <Text
                  style={[
                    styles.tagText,
                    { color: isTwoHand ? colors.primary : '#10B981' },
                  ]}
                >
                  {isTwoHand ? 'Two Hands Required' : 'Single Hand'}
                </Text>
              </View>

              {signData?.isDynamic && (
                <View style={[styles.tag, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                  <Ionicons name="move-outline" size={13} color="#3B82F6" />
                  <Text style={[styles.tagText, { color: '#3B82F6' }]}>Dynamic Motion</Text>
                </View>
              )}
            </View>
          </View>

          {/* Reference Photo Container */}
          <View
            style={[
              styles.imageContainer,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            {signImage ? (
              <Image
                source={signImage}
                style={styles.signImage}
                resizeMode="contain"
                accessibilityLabel={`ISL sign image for letter ${cleanId}`}
              />
            ) : (
              <View style={styles.noImagePlaceholder}>
                <Ionicons name="image-outline" size={48} color={colors.textSecondary} />
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 8 }]}>
                  Sign image for {cleanId}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.verifiedRow}>
            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 6, flex: 1 }]}>
              Authentic ISLRTC / AYJNISHD National Standard Sign
            </Text>
          </View>
        </Card>

        {/* Quick Switch to Numbers (3D Model) Jump Bar */}
        <View
          style={[
            styles.quickNumbersSection,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.quickNumbersHeader}>
            <View style={styles.quickNumbersTitleRow}>
              <Ionicons name="cube" size={16} color={colors.primary} />
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginLeft: 6 }]}>
                Switch to Numeric Sign (3D Model):
              </Text>
            </View>
            <Pressable onPress={() => handleSwitchToNumbers3D('1')}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                View 3D Studio →
              </Text>
            </Pressable>
          </View>

          <View style={styles.numberChipsRow}>
            {NUMBERS_LIST.map((num) => (
              <Pressable
                key={num}
                onPress={() => handleSwitchToNumbers3D(num)}
                style={[
                  styles.numberChip,
                  { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                ]}
                accessibilityLabel={`Switch to number ${num} 3D model`}
              >
                <Text style={[styles.numberChipText, { color: colors.primary }]}>{num}</Text>
                <Ionicons name="cube-outline" size={10} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Step-by-Step Instructions */}
        {signData?.instructions && signData.instructions.length > 0 && (
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="list-outline" size={20} color={colors.primary} />
              <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                How to Make This Sign
              </Text>
            </View>

            <View style={styles.instructionsList}>
              {signData.instructions.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={[styles.stepNumberBadge, { backgroundColor: colors.primarySoft }]}>
                    <Text style={[styles.stepNumberText, { color: colors.primary }]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <Text style={[typography.body, { color: colors.textPrimary, flex: 1, lineHeight: 22 }]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Description & Tips */}
        {signData?.description && (
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                Description
              </Text>
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 22 }]}>
              {signData.description}
            </Text>

            {signData?.tips && (
              <View
                style={[
                  styles.tipsBox,
                  { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                ]}
              >
                <Ionicons name="bulb-outline" size={18} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.textPrimary, marginLeft: 8, flex: 1 }]}>
                  <Text style={{ fontWeight: '700' }}>Pro Tip: </Text>
                  {signData.tips}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Practice CTA */}
        <Pressable
          onPress={() => router.push('/(tabs)/recognize')}
          style={[styles.practiceBtn, { backgroundColor: colors.primary }]}
          accessibilityLabel="Practice sign with camera"
        >
          <Ionicons name="camera" size={20} color="#FFFFFF" />
          <Text style={styles.practiceBtnText}>Practice Sign With Camera</Text>
        </Pressable>

        {/* Bottom Next / Previous Navigation */}
        <View style={styles.navRow}>
          <Pressable
            onPress={() => prevSign && handleNavigateSign(prevSign.id)}
            disabled={!prevSign}
            style={[
              styles.navBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: prevSign ? 1 : 0.35,
              },
            ]}
            accessibilityLabel="Previous letter"
          >
            <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginLeft: 4 }]}>
              {prevSign ? `Letter ${prevSign.id}` : 'Start'}
            </Text>
          </Pressable>

          <View style={[styles.letterIndicator, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.bodyStrong, { color: colors.primary }]}>{cleanId}</Text>
          </View>

          <Pressable
            onPress={() => nextSign && handleNavigateSign(nextSign.id)}
            disabled={!nextSign}
            style={[
              styles.navBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: nextSign ? 1 : 0.35,
              },
            ]}
            accessibilityLabel="Next letter"
          >
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginRight: 4 }]}>
              {nextSign ? `Letter ${nextSign.id}` : 'End'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerCenter: {
    alignItems: 'center',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  modeSwitchWrap: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 3,
    marginBottom: spacing.md,
  },
  modeSwitchActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: radius.md,
    gap: 6,
  },
  modeSwitchActiveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modeSwitchInactive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: radius.md,
    gap: 4,
  },
  modeSwitchInactiveText: {
    fontSize: 12,
    fontWeight: '700',
  },
  imageCard: {
    padding: spacing.md,
  },
  imageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  letterPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterPillText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: 280,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  signImage: {
    width: '100%',
    height: '100%',
  },
  noImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  quickNumbersSection: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.lg,
  },
  quickNumbersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  quickNumbersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  numberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  numberChipText: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  instructionsList: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tipsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    marginTop: spacing.md,
  },
  practiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
    shadowColor: '#F45B16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  practiceBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  letterIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});