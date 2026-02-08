import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#FF6B35', '#FF9F1C', '#FFD700', '#4CAF50', '#2196F3',
  '#9C27B0', '#E91E63', '#00BCD4', '#FF5722', '#8BC34A',
  '#FF4081', '#536DFE', '#FFAB40', '#69F0AE', '#EA80FC',
];

const NUM_PARTICLES = 60;

interface Particle {
  id: number;
  x: number;
  delay: number;
  color: string;
  size: number;
  rotation: number;
  shape: 'square' | 'circle' | 'strip';
}

function generateParticles(): Particle[] {
  return Array.from({ length: NUM_PARTICLES }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_WIDTH,
    delay: Math.random() * 800,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    shape: (['square', 'circle', 'strip'] as const)[Math.floor(Math.random() * 3)],
  }));
}

function ConfettiParticle({ particle }: { particle: Particle }) {
  const translateY = useSharedValue(-50);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      particle.delay,
      withTiming(SCREEN_HEIGHT + 100, {
        duration: 2500 + Math.random() * 1500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );
    rotate.value = withDelay(
      particle.delay,
      withTiming(particle.rotation + 720 * (Math.random() > 0.5 ? 1 : -1), {
        duration: 3000,
      })
    );
    translateX.value = withDelay(
      particle.delay,
      withTiming((Math.random() - 0.5) * 120, {
        duration: 3000,
      })
    );
    opacity.value = withDelay(
      particle.delay + 2000,
      withTiming(0, { duration: 1000 })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const shapeStyle = particle.shape === 'circle'
    ? { borderRadius: particle.size / 2 }
    : particle.shape === 'strip'
    ? { width: particle.size * 0.4, height: particle.size * 2 }
    : {};

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: particle.x,
          top: -20,
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          ...shapeStyle,
        },
        animStyle,
      ]}
    />
  );
}

interface ConfettiCelebrationProps {
  visible: boolean;
  onFinish?: () => void;
}

export function ConfettiCelebration({ visible, onFinish }: ConfettiCelebrationProps) {
  const [particles] = React.useState(generateParticles);

  useEffect(() => {
    if (visible && onFinish) {
      const timer = setTimeout(onFinish, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} particle={p} />
      ))}
    </View>
  );
}
