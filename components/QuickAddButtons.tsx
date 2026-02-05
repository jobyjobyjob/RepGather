import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

interface QuickAddButtonsProps {
  onAdd: (count: number) => void;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

const QUICK_COUNTS = [5, 10, 20, 50];

export function QuickAddButtons({ onAdd, backgroundColor, textColor, accentColor }: QuickAddButtonsProps) {
  const handlePress = (count: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd(count);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: textColor, opacity: 0.6 }]}>Quick Add</Text>
      <View style={styles.buttonsRow}>
        {QUICK_COUNTS.map((count) => (
          <Pressable
            key={count}
            onPress={() => handlePress(count)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor, borderColor: accentColor + '40' },
              pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
            ]}
          >
            <Text style={[styles.buttonText, { color: accentColor }]}>+{count}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
