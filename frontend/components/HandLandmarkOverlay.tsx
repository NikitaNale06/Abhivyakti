import React from 'react';
import Svg, { Circle, Line, G } from 'react-native-svg';
import type { Landmark } from '@/services/landmarks';

interface Props {
  landmarks: Landmark[];
  width: number;
  height: number;
  color?: string;
  dotRadius?: number;
}

// MediaPipe hand skeleton connections
const CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17],
];

// Special dot colors per finger group
const FINGER_COLORS: Record<number, string> = {
  0: '#FFFFFF',   // wrist - white
  1: '#FF6B6B', 2: '#FF6B6B', 3: '#FF6B6B', 4: '#FF6B6B',   // thumb - red
  5: '#FFD93D', 6: '#FFD93D', 7: '#FFD93D', 8: '#FFD93D',   // index - yellow
  9: '#6BCB77', 10: '#6BCB77', 11: '#6BCB77', 12: '#6BCB77', // middle - green
  13: '#4D96FF', 14: '#4D96FF', 15: '#4D96FF', 16: '#4D96FF', // ring - blue
  17: '#C77DFF', 18: '#C77DFF', 19: '#C77DFF', 20: '#C77DFF', // pinky - purple
};

export default function HandLandmarkOverlay({
  landmarks,
  width,
  height,
  color = 'rgba(255,255,255,0.6)',
  dotRadius = 4,
}: Props) {
  if (!landmarks || landmarks.length < 21) return null;

  const px = (lm: Landmark) => lm.x * width;
  const py = (lm: Landmark) => lm.y * height;

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      <G>
        {/* Skeleton connections */}
        {CONNECTIONS.map(([a, b], idx) => (
          <Line
            key={idx}
            x1={px(landmarks[a])}
            y1={py(landmarks[a])}
            x2={px(landmarks[b])}
            y2={py(landmarks[b])}
            stroke={color}
            strokeWidth={1.5}
            strokeOpacity={0.75}
          />
        ))}

        {/* Landmark dots */}
        {landmarks.map((lm, i) => (
          <Circle
            key={i}
            cx={px(lm)}
            cy={py(lm)}
            r={i === 0 ? dotRadius + 2 : dotRadius}
            fill={FINGER_COLORS[i] ?? color}
            fillOpacity={0.9}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth={0.8}
          />
        ))}
      </G>
    </Svg>
  );
}
