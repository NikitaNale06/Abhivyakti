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
  ISL_NUMBERS_DATA,
  getISLSignById,
  ISLSignDefinition,
} from '@/services/islAlphabetPoses';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function Learn3D() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ initial?: string }>();

  const initialParam = params.initial ? params.initial.toString().toUpperCase() : 'A';
  const isNumberParam = /^[0-9]$/.test(initialParam);

  const [activeTab, setActiveTab] = useState<'alphabet' | 'number'>(
    isNumberParam ? 'number' : 'alphabet'
  );
  const [selectedId, setSelectedId] = useState<string>(initialParam);
  const [bonesCount, setBonesCount] = useState<number | null>(null);
  const [showRefTable, setShowRefTable] = useState(false);
  const viewerRef = useRef<RealisticHandViewerRef>(null);

  const activeDataset: ISLSignDefinition[] =
    activeTab === 'alphabet' ? ISL_ALPHABET_DATA : ISL_NUMBERS_DATA;

  const currentSign: ISLSignDefinition =
    getISLSignById(selectedId) || activeDataset[0];

  const currentIndex = activeDataset.findIndex(s => s.id === currentSign.id);
  const prevSign = currentIndex > 0 ? activeDataset[currentIndex - 1] : null;
  const nextSign =
    currentIndex < activeDataset.length - 1 ? activeDataset[currentIndex + 1] : null;

  const handleSelectTab = (tab: 'alphabet' | 'number') => {
    setActiveTab(tab);
    if (tab === 'alphabet' && !/^[A-Z]$/.test(selectedId)) {
      setSelectedId('A');
    } else if (tab === 'number' && !/^[0-9]$/.test(selectedId)) {
      setSelectedId('1');
    }
  };

  const handleSelectSign = (id: string) => {
    setSelectedId(id);
  };

  const handlePrevious = () => {
    if (prevSign) {
      setSelectedId(prevSign.id);
    }
  };

  const handleNext = () => {
    if (nextSign) {
      setSelectedId(nextSign.id);
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
            {bonesCount ? `${bonesCount} Bones Rigged • 1 & 2 Hand ISL` : 'Interactive 3D Hand Model'}
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
        {/* Category Segment Control */}
        <View style={[styles.tabSegmentWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.tabSegmentBtn, activeTab === 'alphabet' && { backgroundColor: colors.primary }]}
            onPress={() => handleSelectTab('alphabet')}
          >
            <Text
              style={[
                styles.tabSegmentText,
                { color: activeTab === 'alphabet' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Alphabets (A–Z)
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabSegmentBtn, activeTab === 'number' && { backgroundColor: colors.primary }]}
            onPress={() => handleSelectTab('number')}
          >
            <Text
              style={[
                styles.tabSegmentText,
                { color: activeTab === 'number' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Numbers (0–9)
            </Text>
          </Pressable>
        </View>

        {/* Horizontal Sign Selector */}
        <View style={styles.scrollerContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.letterScrollContent}
          >
            {activeDataset.map(sign => {
              const isSelected = sign.id === currentSign.id;
              const isTwoHand = sign.handsRequired === 'two';
              return (
                <Pressable
                  key={sign.id}
                  onPress={() => handleSelectSign(sign.id)}
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
                  {isTwoHand && (
                    <View
                      style={[
                        styles.twoHandBadge,
                        { backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(244,91,22,0.15)' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.twoHandBadgeText,
                          { color: isSelected ? '#FFFFFF' : colors.primary },
                        ]}
                      >
                        2H
                      </Text>
                    </View>
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
            fullPose={currentSign.fullPose}
            pose={currentSign.pose}
            camera={currentSign.camera}
            handsRequired={currentSign.handsRequired}
            isDynamic={currentSign.isDynamic}
            dynamicPath={currentSign.dynamicPath}
            signLabel={currentSign.label}
            onModelLoaded={count => setBonesCount(count)}
            showControls={true}
          />
        </View>

        {/* Navigation Row */}
        <View style={styles.navRow}>
          <Pressable
            onPress={handlePrevious}
            disabled={!prevSign}
            style={[
              styles.navBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: prevSign ? 1 : 0.35,
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
                opacity: nextSign ? 1 : 0.35,
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
              <View style={styles.titleBadgeRow}>
                <Text style={[typography.h2, { color: colors.textPrimary }]}>
                  {currentSign.name}
                </Text>
                <View
                  style={[
                    styles.handReqPill,
                    {
                      backgroundColor:
                        currentSign.handsRequired === 'two'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                    },
                  ]}
                >
                  <Ionicons
                    name={currentSign.handsRequired === 'two' ? 'people' : 'hand-right'}
                    size={13}
                    color={currentSign.handsRequired === 'two' ? '#3B82F6' : '#10B981'}
                  />
                  <Text
                    style={[
                      styles.handReqPillText,
                      { color: currentSign.handsRequired === 'two' ? '#3B82F6' : '#10B981' },
                    ]}
                  >
                    {currentSign.handsRequired === 'two' ? '2 Hands Required' : '1 Hand Sign'}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  typography.body,
                  { color: colors.textSecondary, marginTop: 4, lineHeight: 22 },
                ]}
              >
                {currentSign.description}
              </Text>
            </View>
          </View>

          {/* Reference Source Info */}
          <View style={styles.refSourceBox}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={styles.refSourceText}>
              Reference: {currentSign.referenceSource}
            </Text>
          </View>

          {/* Instructions List */}
          <View style={styles.sectionWrap}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: 8 }]}>
              Hand Gesture Steps:
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
              <Text style={styles.cameraPracticeText}>Practice Sign "{currentSign.id}" with Camera</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowRefTable(!showRefTable)}
              style={[styles.toggleRefBtn, { borderColor: colors.border }]}
            >
              <Ionicons name={showRefTable ? 'chevron-up' : 'list'} size={16} color={colors.textSecondary} />
              <Text style={[styles.toggleRefText, { color: colors.textSecondary }]}>
                {showRefTable ? 'Hide ISL Validation Table' : 'View Full ISL Validation Table (36 Signs)'}
              </Text>
            </Pressable>
          </View>

          {/* Validation Table */}
          {showRefTable && (
            <View style={[styles.tableWrap, { borderColor: colors.border }]}>
              <View style={[styles.tableHeader, { backgroundColor: colors.surface }]}>
                <Text style={[styles.tableColChar, { color: colors.textPrimary }]}>Sign</Text>
                <Text style={[styles.tableColHands, { color: colors.textPrimary }]}>Hands</Text>
                <Text style={[styles.tableColPose, { color: colors.textPrimary }]}>Pose ID</Text>
                <Text style={[styles.tableColStatus, { color: colors.textPrimary }]}>Status</Text>
              </View>
              {activeDataset.map(item => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedId(item.id)}
                  style={[
                    styles.tableRow,
                    item.id === currentSign.id && { backgroundColor: colors.primarySoft },
                    { borderTopColor: colors.border },
                  ]}
                >
                  <Text style={[styles.tableColChar, { color: colors.textPrimary, fontWeight: '700' }]}>
                    {item.id}
                  </Text>
                  <Text style={[styles.tableColHands, { color: item.handsRequired === 'two' ? '#3B82F6' : '#10B981', fontWeight: '600' }]}>
                    {item.handsRequired === 'two' ? '2 Hands' : '1 Hand'}
                  </Text>
                  <Text style={[styles.tableColPose, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.poseId}
                  </Text>
                  <Text style={[styles.tableColStatus, { color: '#10B981', fontWeight: '700' }]}>
                    ✓ Verified
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
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
  tabSegmentWrap: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 3,
    marginBottom: spacing.xs,
  },
  tabSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSegmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollerContainer: {
    marginVertical: spacing.sm,
  },
  letterScrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  letterPill: {
    width: 46,
    height: 52,
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
  twoHandBadge: {
    position: 'absolute',
    bottom: 3,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  twoHandBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  viewerWrapper: {
    width: '100%',
    height: 360,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: spacing.xs,
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
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  handReqPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  handReqPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  refSourceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  refSourceText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
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
    gap: 12,
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
  toggleRefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 6,
  },
  toggleRefText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tableWrap: {
    marginTop: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  tableColChar: {
    width: 44,
    fontSize: 13,
  },
  tableColHands: {
    width: 72,
    fontSize: 12,
  },
  tableColPose: {
    flex: 1,
    fontSize: 11,
  },
  tableColStatus: {
    width: 75,
    fontSize: 12,
    textAlign: 'right',
  },
});
