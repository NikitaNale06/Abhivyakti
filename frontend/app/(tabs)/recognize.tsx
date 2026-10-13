import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
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

const CAPTURE_INTERVAL_MS = 1500;

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
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<SimpleResult | null>(null);
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);

  // Lazy-load native modules so Metro doesn't crash if they're not ready
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus('Loading models…');
        const {
  getHandDetector,
  getLandmarksDetector,
  getClassifier,
} = await import('@/services/tfliteModels');
await getHandDetector();
await getLandmarksDetector();
await getClassifier();
        if (!cancelled) {
          setReady(true);
          setStatus('Models ready');
        }
      } catch (e: any) {
        console.error('[recognize] model load failed', e);
        if (!cancelled) {
          setError(
            'Model load failed: ' + (e?.message ?? 'unknown error'),
          );
          setStatus('Error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (active && permission?.granted && ready) {
      intervalRef.current = setInterval(captureAndPredict, CAPTURE_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, permission?.granted, ready, language.code]);

  const captureAndPredict = useCallback(async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.4,
        skipProcessing: true,
      });

      if (!photo?.uri) {
        setStatus('Capture failed');
        return;
      }

      const { detectHands } = await import('@/services/handDetector');
      const { extract130Features } = await import('@/services/landmarks');
      const { classify } = await import('@/services/classifier');

      const hands = await detectHands(photo.uri);
      if (hands.length === 0) {
        setStatus('No hand detected');
        return;
      }

      const features = extract130Features(hands);
      const prediction = await classify(features);

      if (!prediction) {
        setStatus('Low confidence');
        return;
      }

      setStatus(`Detected ${prediction.sign} (${(prediction.confidence * 100).toFixed(0)}%)`);
      setLastResult(prediction);
      setWord((w) => (w + prediction.sign).slice(-40));

      await saveHistoryEntry({
        id: `${Date.now()}-${prediction.sign}`,
        sign: prediction.sign,
        confidence: prediction.confidence,
        timestamp: Date.now(),
      });
    } catch (e: any) {
      console.error('[recognize] predict failed', e);
      setStatus('Error: ' + (e?.message ?? 'unknown'));
    } finally {
      setBusy(false);
    }
  }, [busy]);

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
      >
        <Text style={[typography.h1, { color: colors.textPrimary }]}>Recognize</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
          Offline · On-device · {language.name}
        </Text>

        <View
          style={[
            styles.cameraWrap,
            { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <CameraView ref={cameraRef} style={styles.camera} facing="front" mute />

          {busy && (
            <View style={styles.busyOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </View>

        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Button
            label={active ? 'Stop Continuous' : 'Start Continuous'}
            onPress={() => setActive((a) => !a)}
            variant={active ? 'secondary' : 'primary'}
            disabled={!ready}
            fullWidth
          />
        </View>

        <View
          style={[
            styles.statusBox,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Status</Text>
          <Text style={[typography.body, { color: colors.textPrimary, marginTop: 4 }]}>
            {error ? error : status}
          </Text>
        </View>

        {lastResult && (
          <View
            style={[
              styles.resultBox,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Latest prediction
            </Text>
            <Text
              style={[
                typography.display,
                { color: colors.textPrimary, marginTop: 4 },
              ]}
            >
              {lastResult.sign}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Confidence {(lastResult.confidence * 100).toFixed(0)}%
            </Text>

            {lastResult.alternatives.length > 0 && (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={[typography.small, { color: colors.textMuted }]}>
                  Also possible:{' '}
                  {lastResult.alternatives
                    .map((a) => `${a.sign} ${(a.confidence * 100).toFixed(0)}%`)
                    .join(' · ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {word.length > 0 && (
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
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Built word
              </Text>
              <Pressable onPress={() => setWord('')} hitSlop={12}>
                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text
              style={[typography.h1, { color: colors.textPrimary, marginTop: 4 }]}
            >
              {word}
            </Text>
          </View>
        )}
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
    borderWidth: 1,
    overflow: 'hidden',
  },
  camera: { flex: 1 },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  resultBox: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  wordBox: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});