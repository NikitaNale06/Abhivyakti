import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { predictSign, PredictionResult } from '@/services/api';
import { saveHistoryEntry } from '@/services/storage';

const CAPTURE_INTERVAL_MS = 1500;

export default function Recognize() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<PredictionResult | null>(null);
  const [word, setWord] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active && permission?.granted) {
      intervalRef.current = setInterval(captureAndPredict, CAPTURE_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, permission?.granted, language.code]);

  async function captureAndPredict() {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.4,
        skipProcessing: true,
      });
      if (!photo?.base64) return;

      const result = await predictSign(photo.base64, language.code);
      setLastResult(result);

      if (result.status === 'ok' && result.accepted && result.sign) {
        setWord((w) => (w + result.sign).slice(-40));
        saveHistoryEntry({
          id: Date.now().toString(),
          sign: result.sign,
          confidence: result.confidence ?? 0,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      // silent
    } finally {
      setBusy(false);
    }
  }

  if (!permission) {
    return (
      <Screen edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
          <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.lg }]}>
            Camera permission needed
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
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
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}>
        <Text style={[typography.h1, { color: colors.textPrimary }]}>Recognize</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
          Showing signs in {language.name}
        </Text>

        <View style={[styles.cameraWrap, { borderColor: colors.border }]}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            mute
          />
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
            fullWidth
          />
        </View>

        {lastResult && (
          <View style={[styles.resultBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Latest prediction
            </Text>
            <Text style={[typography.display, { color: colors.textPrimary, marginTop: 4 }]}>
              {lastResult.display ?? lastResult.sign ?? '—'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {lastResult.status === 'ok' && lastResult.confidence
                ? `Confidence ${(lastResult.confidence * 100).toFixed(0)}%`
                : lastResult.message ?? 'Waiting…'}
            </Text>
          </View>
        )}

        {word.length > 0 && (
          <View style={[styles.wordBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Built word</Text>
              <Pressable onPress={() => setWord('')} hitSlop={12}>
                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={[typography.h1, { color: colors.textPrimary, marginTop: 4 }]}>
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
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBox: {
    marginTop: spacing.xl,
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