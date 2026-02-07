import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface CounterButtonProps {
  count: number;
  onIncrement: () => void;
  tintColor: string;
  textColor: string;
  exerciseLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CounterButton({ count, onIncrement, tintColor, textColor, exerciseLabel = 'push-up' }: CounterButtonProps) {
  const scale = useSharedValue(1);
  const counterScale = useSharedValue(1);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const counterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: counterScale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withSpring(0.92, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    counterScale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    onIncrement();
  };

  return (
    <View style={styles.container}>
      <Animated.View style={counterStyle}>
        <Text style={[styles.countText, { color: textColor }]}>{count}</Text>
        <Text style={[styles.labelText, { color: textColor, opacity: 0.6 }]}>today</Text>
      </Animated.View>
      <AnimatedPressable
        onPress={handlePress}
        style={[styles.button, { backgroundColor: tintColor }, buttonStyle]}
      >
        <Ionicons name="add" size={48} color="#FFFFFF" />
      </AnimatedPressable>
      <Text style={[styles.hintText, { color: textColor, opacity: 0.5 }]}>Tap to add 1 {exerciseLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  countText: {
    fontSize: 64,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  labelText: {
    fontSize: 16,
    fontWeight: '500' as const,
    textAlign: 'center',
    marginTop: -8,
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  hintText: {
    fontSize: 14,
    marginTop: 8,
  },
});
