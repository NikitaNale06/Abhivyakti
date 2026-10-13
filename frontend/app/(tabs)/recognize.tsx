import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { saveHistoryEntry } from '@/services/storage';
import HandLandmarkOverlay from '@/components/HandLandmarkOverlay';
import type { Landmark } from '@/services/landmarks';

const LOOP_DELAY_MS = 1;

// Stability filter (same idea as the Python script)
const STABLE_FRAMES = 7; // same label this many frames in a row
const MIN_CONF = 0.4; // minimum confidence to count a frame
const MAX_MISSED_FRAMES = 2; // tolerate brief detection drop-outs

// Set to true if signs come out mirrored vs. your Python training pipeline
// (test with an asymmetric sign / two-hand sign order).
const MIRROR_X = false;

interface SimpleResult {
  sign: string;
  confidence: number;
  alternatives: { sign: string; confidence: number }[];
}

interface StableState {
  sign: string;
  count: number;
  locked: boolean;
  missed: number;
}

const freshStable = (): StableState => ({ sign: '', count: 0, locked: false, missed: 0 });

export default function Recognize() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [active, setActive] = useState(false);
  const busyRef = useRef(false);
  const stableRef = useRef<StableState>(freshStable());
  const [lastResult, setLastResult] = useState<SimpleResult | null>(null);
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Idle');
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [handsLandmarks, setHandsLandmarks] = useState<Landmark[][]>([]);
  const [cameraDims, setCameraDims] = useState({ width: 0, height: 0 });

  const [ready, setReady] = useState(false);

  // Animated dot to show processing without a flicker overlay
  const dotOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    pulseAnim.current?.stop();
    pulseAnim.current = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 0.2, duration: 400, useNativeDriver: true }),
      ]),
    );
    pulseAnim.current.start();
  }, [dotOpacity]);

  const stopPulse = useCallback(() => {
    pulseAnim.current?.stop();
    Animated.timing(dotOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, [dotOpacity]);

  // Lazy-load native modules
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus('Loading models…');
        const { getHandDetector, getLandmarksDetector, getClassifier } =
          await import('@/services/tfliteModels');
        await getHandDetector();
        await getLandmarksDetector();
        await getClassifier();
        if (!cancelled) {
          setReady(true);
          setStatus('Ready — tap Start to begin');
        }
      } catch (e: any) {
        console.error('[recognize] model load failed', e);
        if (!cancelled) {
          setError('Model load failed: ' + (e?.message ?? 'unknown error'));
          setStatus('Error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Inference loop (setTimeout chain avoids interval drift + overlapping runs)
  useEffect(() => {
    if (!active || !permission?.granted || !ready) return;

    let cancelled = false;
    stableRef.current = freshStable();

    // Called when there is no usable frame result (no hand / unclear sign).
    const registerMiss = () => {
      const s = stableRef.current;
      s.missed += 1;
      if (s.missed > MAX_MISSED_FRAMES) {
        stableRef.current = freshStable(); // hand really left: allow same letter again
      }
    };

    const runLoop = async () => {
      if (cancelled) return;

      if (!busyRef.current && cameraRef.current) {
        busyRef.current = true;
        startPulse();
        try {
          const photo = (await cameraRef.current.takePictureAsync({
            base64: false,
            quality: 0.8,
            skipProcessing: true,
          } as any)) as any;

          if (!photo?.uri) {
            setStatus('Capture failed');
          } else {
            const { detectHandsWithSize } = await import('@/services/handDetector');
            const { extract130Features } = await import('@/services/landmarks');
            const { classify } = await import('@/services/classifier');

            const { hands, frameWidth, frameHeight } = await detectHandsWithSize(photo.uri);
            if (cancelled) return;

            if (hands.length === 0) {
              setStatus('No hand detected');
              setHandsLandmarks([]);
              registerMiss();
            } else {
              setHandsLandmarks(hands.map((h) => h.landmarks));

              // Optional mirror fix for features only (overlay stays as captured)
              const featHands = MIRROR_X
                ? hands.map((h) => ({
                  ...h,
                  landmarks: h.landmarks.map((l) => ({ ...l, x: 1 - l.x })),
                }))
                : hands;

              const features = extract130Features(featHands, frameWidth, frameHeight);
              const prediction = await classify(features);

              if (!prediction || prediction.confidence < MIN_CONF) {
                setStatus(`${hands.length} hand(s) · Sign unclear`);
                registerMiss();
              } else {
                const s = stableRef.current;
                if (s.sign === prediction.sign) {
                  s.count += 1;
                  s.missed = 0;
                } else {
                  stableRef.current = { sign: prediction.sign, count: 1, locked: false, missed: 0 };
                }

                const cur = stableRef.current;
                setLastResult(prediction);
                setStatus(
                  `${prediction.sign} · ${(prediction.confidence * 100).toFixed(0)}% · ` +
                  `${Math.min(cur.count, STABLE_FRAMES)}/${STABLE_FRAMES}${cur.locked ? ' ✓' : ''}`,
                );

                if (cur.count >= STABLE_FRAMES && !cur.locked) {
                  cur.locked = true; // add once per hold
                  setWord((w) => (w + prediction.sign).slice(-40));
                  await saveHistoryEntry({
                    id: `${Date.now()}-${prediction.sign}`,
                    sign: prediction.sign,
                    confidence: prediction.confidence,
                    timestamp: Date.now(),
                  });
                }
              }
            }
          }
        } catch (e: any) {
          console.error('[recognize] predict failed', e);
          setStatus('Error: ' + (e?.message ?? 'unknown'));
        } finally {
          busyRef.current = false;
          stopPulse();
        }
      }

      if (!cancelled) {
        intervalRef.current = setTimeout(runLoop, LOOP_DELAY_MS);
      }
    };

    intervalRef.current = setTimeout(runLoop, 300);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      busyRef.current = false;
      stableRef.current = freshStable();
      stopPulse();
    };
  }, [active, permission?.granted, ready, startPulse, stopPulse]);

  if (!permission) {
    return (
      <Screen edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}>
            Checking camera permission…
          </Text>
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
          <Text
            style={[
              typography.h3,
              { color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' },
            ]}
          >
            Camera permission needed
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
            ]}
          >
            Abhivyakti uses the camera to recognize ISL signs.
          </Text>
          <View style={{ marginTop: spacing.xl }}>
            <Button label="Allow Camera" onPress={requestPermission} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
        removeClippedSubviews={false}
      >
        <Text style={[typography.h1, { color: colors.textPrimary }]}>Recognize</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
          Offline · On-device · {language.name}
        </Text>

        <View
          style={[
            styles.cameraWrap,
            {
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: colors.backgroundSecondary,
            },
          ]}
          onLayout={(e: LayoutChangeEvent) => {
            const { width, height } = e.nativeEvent.layout;
            setCameraDims({ width, height });
          }}
        >
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            mute
            animateShutter={false}
            flash="off"
          />

          {cameraDims.width > 0 &&
            handsLandmarks.map((lms, i) => (
              <HandLandmarkOverlay
                key={i}
                landmarks={lms}
                width={cameraDims.width}
                height={cameraDims.height}
              />
            ))}

          <Animated.View style={[styles.recordingDot, { opacity: dotOpacity }]}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          </Animated.View>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Button
            label={active ? 'Stop' : 'Start'}
            onPress={() => setActive((a) => !a)}
            disabled={!ready}
          />
        </View>

        <View
          style={[
            styles.statusBox,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Status</Text>
          <Text
            style={[typography.body, { color: colors.textPrimary, marginTop: 4 }]}
            numberOfLines={2}
          >
            {error ? error : status}
          </Text>
        </View>

        <View
          style={[
            styles.resultBox,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Latest prediction
          </Text>
          {lastResult ? (
            <>
              <Text style={[typography.display, { color: colors.textPrimary, marginTop: 4 }]}>
                {lastResult.sign}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Confidence {(lastResult.confidence * 100).toFixed(0)}%
              </Text>
              {lastResult.alternatives.length > 0 && (
                <Text
                  style={[typography.small, { color: colors.textMuted, marginTop: spacing.xs }]}
                >
                  Also:{' '}
                  {lastResult.alternatives
                    .map((a) => `${a.sign} ${(a.confidence * 100).toFixed(0)}%`)
                    .join(' · ')}
                </Text>
              )}
            </>
          ) : (
            <Text style={[typography.body, { color: colors.textMuted, marginTop: 4 }]}>—</Text>
          )}
        </View>

        <View
          style={[
            styles.wordBox,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Built word</Text>
            <Pressable onPress={() => setWord('')} hitSlop={12}>
              <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text
            style={[
              typography.h1,
              { color: word.length > 0 ? colors.textPrimary : colors.textMuted, marginTop: 4 },
            ]}
          >
            {word.length > 0 ? word : '—'}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  cameraWrap: {
    marginTop: spacing.lg,
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    borderWidth: 2,
    overflow: 'hidden',
  },
  camera: { flex: 1 },
  recordingDot: { position: 'absolute', top: 12, right: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 64,
  },
  resultBox: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 110,
  },
  wordBox: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 80,
  },
});
