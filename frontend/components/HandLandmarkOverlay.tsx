import React from 'react';
import Svg, { Circle, Line, G } from 'react-native-svg';
import type { Landmark } from '@/services/landmarks';

interface Props {
  landmarks: Landmark[] | Landmark[][];
  width: number;
  height: number;
  isFrontCamera?: boolean;
  color?: string;
  dotRadius?: number;
}

// MediaPipe hand skeleton connections matching t.py / isl_features.py
const CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index finger
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle finger & palm bridge
  [5, 9], [9, 10], [10, 11], [11, 12],
  // Ring finger & palm bridge
  [9, 13], [13, 14], [14, 15], [15, 16],
  // Pinky finger & palm bridge
  [13, 17], [17, 18], [18, 19], [19, 20],
  // Palm base to pinky base closure
  [0, 17],
];

// Landmark dot colors matching joints
const JOINT_COLORS: Record<number, string> = {
  0: '#FFFFFF', // Wrist - clean white
  // Thumb joints
  1: '#FF5252', 2: '#FF5252', 3: '#FF5252', 4: '#FF1744',
  // Index joints
  5: '#FFD600', 6: '#FFD600', 7: '#FFD600', 8: '#FFEA00',
  // Middle joints
  9: '#00E676', 10: '#00E676', 11: '#00E676', 12: '#00C853',
  // Ring joints
  13: '#448AFF', 14: '#448AFF', 15: '#448AFF', 16: '#2979FF',
  // Pinky joints
  17: '#E040FB', 18: '#E040FB', 19: '#E040FB', 20: '#D500F9',
};

function renderHandSkeleton(
  hand: Landmark[],
  handIdx: number,
  width: number,
  height: number,
  isFrontCamera: boolean,
  lineColor: string,
  dotRadius: number,
) {
  if (!hand || hand.length < 21) return null;

  const getPx = (lm: Landmark | undefined) => {
    if (!lm || !Number.isFinite(lm.x)) return 0;
    const nx = isFrontCamera ? 1 - lm.x : lm.x;
    return Math.max(0, Math.min(width, nx * width));
  };

  const getPy = (lm: Landmark | undefined) => {
    if (!lm || !Number.isFinite(lm.y)) return 0;
    return Math.max(0, Math.min(height, lm.y * height));
  };

  return (
    <G key={`hand-${handIdx}`}>
      {/* Background shadow line for contrast on light backgrounds */}
      {CONNECTIONS.map(([a, b], idx) => {
        const p1 = hand[a];
        const p2 = hand[b];
        if (!p1 || !p2) return null;

        const x1 = getPx(p1);
        const y1 = getPy(p1);
        const x2 = getPx(p2);
        const y2 = getPy(p2);

        if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
          return null;
        }

        return (
          <Line
            key={`shadow-${handIdx}-${idx}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#000000"
            strokeWidth={4.5}
            strokeOpacity={0.6}
            strokeLinecap="round"
          />
        );
      })}

      {/* Main vibrant skeleton lines (as in t.py cv2.line green) */}
      {CONNECTIONS.map(([a, b], idx) => {
        const p1 = hand[a];
        const p2 = hand[b];
        if (!p1 || !p2) return null;

        const x1 = getPx(p1);
        const y1 = getPy(p1);
        const x2 = getPx(p2);
        const y2 = getPy(p2);

        if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
          return null;
        }

        return (
          <Line
            key={`line-${handIdx}-${idx}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={lineColor}
            strokeWidth={2.5}
            strokeOpacity={0.95}
            strokeLinecap="round"
          />
        );
      })}

      {/* Joint landmark circles (as in t.py cv2.circle) */}
      {hand.map((lm, i) => {
        if (!lm) return null;
        const cx = getPx(lm);
        const cy = getPy(lm);
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

        const isTip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
        const isWrist = i === 0;
        const r = isTip ? dotRadius + 1.5 : isWrist ? dotRadius + 1.0 : dotRadius;
        const dotColor = JOINT_COLORS[i] ?? '#00E676';

        return (
          <G key={`dot-group-${handIdx}-${i}`}>
            <Circle
              cx={cx}
              cy={cy}
              r={r + 1.5}
              fill="#000000"
              fillOpacity={0.7}
            />
            <Circle
              cx={cx}
              cy={cy}
              r={r}
              fill={dotColor}
              fillOpacity={1.0}
              stroke="#FFFFFF"
              strokeWidth={1}
            />
          </G>
        );
      })}
    </G>
  );
}

export default function HandLandmarkOverlay({
  landmarks,
  width,
  height,
  isFrontCamera = true,
  color = '#00FF66', // Bright green as in t.py
  dotRadius = 4,
}: Props) {
  if (!landmarks || width <= 0 || height <= 0) return null;

  // Normalize to array of hands
  const hands: Landmark[][] =
    Array.isArray(landmarks[0])
      ? (landmarks as Landmark[][])
      : [landmarks as Landmark[]];

  const validHands = hands.filter((h) => Array.isArray(h) && h.length >= 21);
  if (validHands.length === 0) return null;

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {validHands.map((hand, idx) =>
        renderHandSkeleton(hand, idx, width, height, isFrontCamera, color, dotRadius)
      )}
    </Svg>
  );
}
