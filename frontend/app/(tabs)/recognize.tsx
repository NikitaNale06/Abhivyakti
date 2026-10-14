import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Animated,
  AppState,
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

// Delay between recognition attempts (0ms for instantaneous continuous loop)
const LOOP_DELAY_MS = 0;

// Camera recovery
const CAPTURE_BACKOFF_BASE_MS = 30; // minimal backoff only on failure
const CAPTURE_BACKOFF_MAX_MS = 200;
const MAX_CAPTURE_FAILS = 3; // remount faster
const CAMERA_SETTLE_MS = 0; // immediate start with 0 delay

// Stability filter
const STABLE_FRAMES = 2; // quick 2-frame lock for instant real-time response
const MIN_CONF = 0.35;
const MAX_MISSED_FRAMES = 2;

// Set to true if your model expects mirrored hand features.
const MIRROR_X = false;

const OVERLAY_BG = 'rgba(0,0,0,0.5)';
const GOOD = '#34D399';
const BAD = '#F87171';

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

const freshStable = (): StableState => ({
  sign: '',
  count: 0,
  locked: false,
  missed: 0,
});

export default function Recognize() {
  const { colors } = useTheme();
  const { language } = useLanguage();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);

  // Camera lifecycle
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraIssue, setCameraIssue] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const captureFailsRef = useRef(0);

  // Current-frame prediction (null when no hand / unclear sign)
  const [liveResult, setLiveResult] = useState<SimpleResult | null>(null);
  const [holdCount, setHoldCount] = useState(0);
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState('Loading models…');

  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');

  const [handsLandmarks, setHandsLandmarks] = useState<Landmark[][]>([]);
  const [cameraDims, setCameraDims] = useState({ width: 0, height: 0 });
  const [detectedHandsCount, setDetectedHandsCount] = useState(0);

  const busyRef = useRef(false);
  const stableRef = useRef<StableState>(freshStable());
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectorModulesRef = useRef<{
    detectHandsWithSize: (uri: string) => Promise<{ hands: any[]; frameWidth: number; frameHeight: number }>;
    extract130Features: (hands: any[], w?: number, h?: number) => number[];
    classify: (features: number[]) => Promise<any>;
  } | null>(null);

  // Processing dot
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

  // Pause when backgrounded; remount camera when returning (Android kills the session)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const isActive = state === 'active';
      setAppActive(isActive);
      if (isActive) {
        setCameraReady(false);
        setCameraKey((k) => k + 1);
      }
    });
    return () => sub.remove();
  }, []);

  // Load models
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingText('Loading models…');
        setError(null);

        const { getHandDetector, getLandmarksDetector, getClassifier } =
          await import('@/services/tfliteModels');

        await getHandDetector();
        await getLandmarksDetector();
        await getClassifier();

        const [handModule, landmarksModule, classifierModule] = await Promise.all([
          import('@/services/handDetector'),
          import('@/services/landmarks'),
          import('@/services/classifier'),
        ]);

        if (!cancelled) {
          detectorModulesRef.current = {
            detectHandsWithSize: handModule.detectHandsWithSize,
            extract130Features: landmarksModule.extract130Features,
            classify: classifierModule.classify,
          };
          setReady(true);
          setLoadingText('');
        }
      } catch (e: any) {
        console.error('[recognize] model load failed', e);
        if (!cancelled) {
          setError('Model load failed: ' + (e?.message ?? 'unknown error'));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Recognition loop
  useEffect(() => {
    if (!active || !permission?.granted || !ready || !cameraReady || !appActive) return;

    let cancelled = false;
    stableRef.current = freshStable();
    captureFailsRef.current = 0;

    const registerMiss = () => {
      const current = stableRef.current;
      current.missed += 1;
      if (current.missed > MAX_MISSED_FRAMES) {
        stableRef.current = freshStable();
        setHoldCount(0);
      }
    };

    const runLoop = async () => {
      if (cancelled) return;

      let nextDelay = LOOP_DELAY_MS;

      if (!busyRef.current && cameraRef.current) {
        busyRef.current = true;
        startPulse();

        try {
          // ---- Capture (transient failures are expected on Android) ----
          let photo: any = null;
          try {
            photo = await cameraRef.current.takePictureAsync({
              base64: false,
              quality: 0.2, // minimal compression time for zero latency
              skipProcessing: true,
              exif: false,   // skip EXIF writing
              shutterSound: false,
            } as any);
            captureFailsRef.current = 0;
            setCameraIssue(false);
          } catch (captureErr: any) {
            captureFailsRef.current += 1;
            console.warn(
              `[recognize] capture failed (${captureFailsRef.current}/${MAX_CAPTURE_FAILS}):`,
              captureErr?.message,
            );
            setCameraIssue(true);
            nextDelay = Math.min(
              CAPTURE_BACKOFF_MAX_MS,
              CAPTURE_BACKOFF_BASE_MS * 2 ** captureFailsRef.current,
            );

            if (captureFailsRef.current >= MAX_CAPTURE_FAILS) {
              // Camera session is stuck: remount it. Effect restarts when ready.
              captureFailsRef.current = 0;
              setCameraReady(false);
              setCameraKey((k) => k + 1);
            }
          }

          if (cancelled) return;

          if (!photo?.uri) {
            registerMiss();
          } else {
            const modules = detectorModulesRef.current;
            const detectHandsWithSize =
              modules?.detectHandsWithSize ?? (await import('@/services/handDetector')).detectHandsWithSize;
            const extract130Features =
              modules?.extract130Features ?? (await import('@/services/landmarks')).extract130Features;
            const classify =
              modules?.classify ?? (await import('@/services/classifier')).classify;

            const { hands, frameWidth, frameHeight } = await detectHandsWithSize(photo.uri);
            if (cancelled) return;

            setDetectedHandsCount(hands.length);

            if (hands.length === 0) {
              setHandsLandmarks([]);
              setLiveResult(null);
              registerMiss();
            } else {
              setHandsLandmarks(hands.map((hand) => hand.landmarks));

              // Mirror correction for model features only (overlay unchanged)
              const featureHands = MIRROR_X
                ? hands.map((hand) => ({
                  ...hand,
                  landmarks: hand.landmarks.map((l: Landmark) => ({ ...l, x: 1 - l.x })),
                }))
                : hands;

              const features = extract130Features(featureHands, frameWidth, frameHeight);
              const prediction = await classify(features);

              if (cancelled) return;

              if (!prediction || prediction.confidence < MIN_CONF) {
                setLiveResult(null);
                registerMiss();
              } else {
                const current = stableRef.current;

                if (current.sign === prediction.sign) {
                  current.count += 1;
                  current.missed = 0;
                } else {
                  stableRef.current = {
                    sign: prediction.sign,
                    count: 1,
                    locked: false,
                    missed: 0,
                  };
                }

                const stable = stableRef.current;
                setLiveResult(prediction);
                setHoldCount(Math.min(stable.count, STABLE_FRAMES));

                // Add the sign once per hold
                if (stable.count >= STABLE_FRAMES && !stable.locked) {
                  stable.locked = true;
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
          console.error('[recognize] pipeline failed', e);
        } finally {
          busyRef.current = false;
          stopPulse();
        }
      }

      if (!cancelled) {
        intervalRef.current = setTimeout(runLoop, nextDelay);
      }
    };

    // Give the camera a moment to settle after it reports ready
    intervalRef.current = setTimeout(runLoop, CAMERA_SETTLE_MS);

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
  }, [active, permission?.granted, ready, cameraReady, appActive, startPulse, stopPulse]);

  // Reset live info whenever recognition stops
  useEffect(() => {
    if (!active) {
      setHandsLandmarks([]);
      setDetectedHandsCount(0);
      setLiveResult(null);
      setHoldCount(0);
      setCameraIssue(false);
    }
  }, [active]);

  const switchCamera = () => {
    busyRef.current = false;
    stableRef.current = freshStable();
    captureFailsRef.current = 0;
    setHandsLandmarks([]);
    setDetectedHandsCount(0);
    setLiveResult(null);
    setCameraFacing((c) => (c === 'front' ? 'back' : 'front'));
    // Keep UI responsive — ensure camera is marked ready after lens switch
    setTimeout(() => {
      setCameraReady(true);
    }, 250);
  };

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

  const handsDetected = active && detectedHandsCount > 0;

  const badgeText = error
    ? 'Error'
    : loadingText
      ? loadingText
      : !cameraReady
        ? 'Starting camera…'
        : !active
          ? 'Tap Start'
          : cameraIssue
            ? 'Camera busy… retrying'
            : handsDetected
              ? `${detectedHandsCount} hand${detectedHandsCount > 1 ? 's' : ''} detected`
              : 'No hand detected';

  const badgeColor = !active || cameraIssue || !cameraReady ? '#FBBF24' : handsDetected ? GOOD : BAD;

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

        {/* Camera + overlays */}
        <View
          style={[
            styles.cameraWrap,
            {
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: colors.backgroundSecondary,
            },
          ]}
          onLayout={(event: LayoutChangeEvent) => {
            const { width, height } = event.nativeEvent.layout;
            setCameraDims({ width, height });
          }}
        >
          <CameraView
            key={cameraKey}
            ref={cameraRef}
            style={styles.camera}
            facing={cameraFacing}
            mute
            animateShutter={false}
            flash="off"
            onCameraReady={() => setCameraReady(true)}
            onMountError={(e: any) => {
              console.warn('[recognize] camera mount error', e?.message);
              setCameraReady(false);
              setTimeout(() => {
                setCameraKey((k) => k + 1);
                setCameraReady(true);
              }, 400);
            }}
          />

          {cameraDims.width > 0 &&
            handsLandmarks.map((landmarks, index) => (
              <HandLandmarkOverlay
                key={index}
                landmarks={landmarks}
                width={cameraDims.width}
                height={cameraDims.height}
                isFrontCamera={cameraFacing === 'front'}
              />
            ))}

          {/* Top-left translucent badge */}
          <View style={styles.badge} pointerEvents="none">
            <View style={styles.badgeRow}>
              <Animated.View
                style={[
                  styles.dot,
                  { backgroundColor: colors.primary, opacity: dotOpacity },
                ]}
              />
              <Ionicons name="hand-left-outline" size={14} color={badgeColor} />
              <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
            </View>

            {active && cameraReady && (
              <View style={styles.badgeRow}>
                {liveResult ? (
                  <>
                    <Text style={styles.badgeLetter}>{liveResult.sign}</Text>
                    <Text style={styles.badgeScore}>
                      {(liveResult.confidence * 100).toFixed(0)}%
                    </Text>
                    <Text style={styles.badgeHold}>
                      {holdCount}/{STABLE_FRAMES}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.badgeMuted}>Letter —</Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Start / Stop + switch camera */}
        <View style={styles.controlsRow}>
          <View style={{ flex: 1 }}>
            <Button
              label={active ? 'Stop' : 'Start'}
              onPress={() => setActive((a) => !a)}
              disabled={!ready || !cameraReady}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch camera"
            onPress={switchCamera}
            style={[
              styles.iconButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Ionicons name="camera-reverse-outline" size={24} color={colors.primary} />
          </Pressable>
        </View>

        {/* Word being formed */}
        <View
          style={[
            styles.wordBox,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <View style={styles.wordHeader}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Built word
            </Text>

            <View style={styles.wordActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add space"
                onPress={() => setWord((w) => (w + ' ').slice(-40))}
                hitSlop={10}
                style={[styles.smallBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="return-down-back-outline" size={18} color={colors.textMuted} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete last letter"
                onPress={() => setWord((w) => w.slice(0, -1))}
                hitSlop={10}
                style={[styles.smallBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="backspace-outline" size={18} color={colors.textMuted} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear built word"
                onPress={() => setWord('')}
                hitSlop={10}
                style={[styles.smallBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <Text
            style={[
              typography.h1,
              {
                color: word.length > 0 ? colors.textPrimary : colors.textMuted,
                marginTop: spacing.sm,
              },
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  cameraWrap: {
    marginTop: spacing.lg,
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    borderWidth: 2,
    overflow: 'hidden',
  },
  camera: { flex: 1 },

  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: OVERLAY_BG,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    maxWidth: '75%',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeLetter: { color: '#fff', fontSize: 22, fontWeight: '800' },
  badgeScore: { color: '#fff', fontSize: 14, fontWeight: '700' },
  badgeHold: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
  badgeMuted: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  iconButton: {
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },

  wordBox: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 90,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  smallBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});