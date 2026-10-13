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

const CAPTURE_INTERVAL_MS = 2000;

interface SimpleResult {
  sign: string;
  confidence: number;
  alternatives: { sign: string; confidence: number }[];
}

export default function Recognize() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [active, setActive] = useState(false);
  const busyRef = useRef(false);
  const [lastResult, setLastResult] = useState<SimpleResult | null>(null);
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Idle');
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
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

  // Run inference loop using setTimeout chains (avoids interval drift + race conditions)
  useEffect(() => {
    if (!active || !permission?.granted || !ready) return;

    let cancelled = false;

    const runLoop = async () => {
      if (cancelled) return;

      if (!busyRef.current && cameraRef.current) {
        busyRef.current = true;
        startPulse();
        try {
          const photoRef = await cameraRef.current.takePictureAsync({
            base64: false,
            quality: 0.5,
            skipProcessing: true,
          } as any);
          const photo = photoRef as any;

          if (!photo?.uri) {
            setStatus('Capture failed');
          } else {
            const { detectHands } = await import('@/services/handDetector');
            const { extract130Features } = await import('@/services/landmarks');
            const { classify } = await import('@/services/classifier');

            const hands = await detectHands(photo.uri);
            if (hands.length === 0) {
              setStatus('No hand detected');
              setLandmarks(null);
            } else {
              // Show landmarks from first detected hand
              setLandmarks(hands[0].landmarks);

              const features = extract130Features(hands);
              const prediction = await classify(features);

              if (!prediction) {
                setStatus(`Hand detected · Sign unclear`);
              } else {
                setStatus(
                  `${prediction.sign}  ${(prediction.confidence * 100).toFixed(0)}%`,
                );
                setLastResult(prediction);
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
        } catch (e: any) {
          console.error('[recognize] predict failed', e);
          setStatus('Error: ' + (e?.message ?? 'unknown'));
        } finally {
          busyRef.current = false;
          stopPulse();
        }
      }

      if (!cancelled) {
        intervalRef.current = setTimeout(runLoop, CAPTURE_INTERVAL_MS);
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
        // Prevent scroll re-render from triggering camera flicker
        removeClippedSubviews={false}
      >
        <Text style={[typography.h1, { color: colors.textPrimary }]}>Recognize</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
          Offline · On-device · {language.name}
        </Text>

        {/* Camera + live indicator */}
        <View
          style={[
            styles.cameraWrap,
            { borderColor: active ? colors.primary : colors.border, backgroundColor: colors.backgroundSecondary },
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

          {/* Landmark skeleton overlay */}
          {landmarks && cameraDims.width > 0 && (
            <HandLandmarkOverlay
              landmarks={landmarks}
              width={cameraDims.width}
              height={cameraDims.height}
            />
          )}

          {/* Recording pulse dot */}
          {active && (
            <View style={styles.recordingDot}>
              <Animated.View
                style={[styles.dot, { opacity: dotOpacity, backgroundColor: colors.primary }]}
              />
            </View>
          )}
        </View>

        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Button
            label={active ? 'Stop' : 'Start Recognizing'}
            onPress={() => {
              setActive((a) => !a);
              if (active) setStatus('Stopped');
            }}
            variant={active ? 'secondary' : 'primary'}
            disabled={!ready}
            fullWidth
          />
        </View>

        {/* Status box — fixed height prevents layout shift */}
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

        {/* Result box — always rendered, just shows placeholder when empty */}
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
              <Text
                style={[typography.display, { color: colors.textPrimary, marginTop: 4 }]}
              >
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
            <Text style={[typography.body, { color: colors.textMuted, marginTop: 4 }]}>
              —
            </Text>
          )}
        </View>

        {/* Word builder — always rendered, zero height when empty */}
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
  recordingDot: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
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