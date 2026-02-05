import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, useColorScheme, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { addDays, addWeeks, addMonths, format } from 'date-fns';

import Colors from '@/constants/colors';
import { usePushups } from '@/contexts/PushupContext';
import { getTodayDateString } from '@/lib/types';

const PRESET_GOALS = [1000, 2000, 5000, 10000];
const DURATION_OPTIONS = [
  { label: '2 Weeks', value: 14 },
  { label: '1 Month', value: 30 },
  { label: '2 Months', value: 60 },
  { label: '3 Months', value: 90 },
];

export default function SetupScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { setGoal } = usePushups();

  const [goalAmount, setGoalAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(30);

  const handleSelectPreset = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPreset(amount);
    setGoalAmount(amount.toString());
  };

  const handleSelectDuration = (days: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDuration(days);
  };

  const handleGoalChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setGoalAmount(numericText);
    const num = parseInt(numericText, 10);
    if (PRESET_GOALS.includes(num)) {
      setSelectedPreset(num);
    } else {
      setSelectedPreset(null);
    }
  };

  const handleStartChallenge = async () => {
    const amount = parseInt(goalAmount, 10);
    if (!amount || amount < 1 || !selectedDuration) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const startDate = getTodayDateString();
    const endDate = format(addDays(new Date(), selectedDuration), 'yyyy-MM-dd');

    await setGoal({
      totalGoal: amount,
      startDate,
      endDate,
    });

    router.back();
  };

  const dailyAverage = goalAmount && selectedDuration
    ? Math.ceil(parseInt(goalAmount, 10) / selectedDuration)
    : 0;

  const isValid = goalAmount && parseInt(goalAmount, 10) > 0 && selectedDuration;

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: colors.card },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
          Set Your Goal
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            How many push-ups?
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text, fontFamily: 'Inter_700Bold' }]}
              value={goalAmount}
              onChangeText={handleGoalChange}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={7}
            />
            <Text style={[styles.inputSuffix, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              push-ups
            </Text>
          </View>
          <View style={styles.presetRow}>
            {PRESET_GOALS.map((amount) => (
              <Pressable
                key={amount}
                onPress={() => handleSelectPreset(amount)}
                style={({ pressed }) => [
                  styles.presetButton,
                  {
                    backgroundColor: selectedPreset === amount ? colors.tint : colors.card,
                    borderColor: selectedPreset === amount ? colors.tint : colors.border,
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text
                  style={[
                    styles.presetText,
                    {
                      color: selectedPreset === amount ? '#FFFFFF' : colors.text,
                      fontFamily: 'Inter_600SemiBold',
                    },
                  ]}
                >
                  {amount >= 1000 ? `${amount / 1000}K` : amount}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            Challenge duration
          </Text>
          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleSelectDuration(option.value)}
                style={({ pressed }) => [
                  styles.durationButton,
                  {
                    backgroundColor: selectedDuration === option.value ? colors.tint : colors.card,
                    borderColor: selectedDuration === option.value ? colors.tint : colors.border,
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text
                  style={[
                    styles.durationText,
                    {
                      color: selectedDuration === option.value ? '#FFFFFF' : colors.text,
                      fontFamily: 'Inter_600SemiBold',
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {isValid && (
          <View style={[styles.summaryCard, { backgroundColor: colors.tint + '15' }]}>
            <View style={styles.summaryRow}>
              <Ionicons name="calculator" size={20} color={colors.tint} />
              <Text style={[styles.summaryText, { color: colors.text, fontFamily: 'Inter_500Medium' }]}>
                That's about <Text style={[styles.summaryHighlight, { color: colors.tint, fontFamily: 'Inter_700Bold' }]}>{dailyAverage}</Text> push-ups per day
              </Text>
            </View>
            <Text style={[styles.summarySubtext, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              End date: {format(addDays(new Date(), selectedDuration!), 'MMMM d, yyyy')}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) }]}>
        <Pressable
          onPress={handleStartChallenge}
          disabled={!isValid}
          style={({ pressed }) => [
            styles.startButton,
            {
              backgroundColor: isValid ? colors.tint : colors.progressBackground,
            },
            pressed && isValid && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text
            style={[
              styles.startButtonText,
              {
                color: isValid ? '#FFFFFF' : colors.textSecondary,
                fontFamily: 'Inter_600SemiBold',
              },
            ]}
          >
            Start Challenge
          </Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={isValid ? '#FFFFFF' : colors.textSecondary}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 32,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  input: {
    flex: 1,
    fontSize: 32,
    paddingVertical: 0,
  },
  inputSuffix: {
    fontSize: 16,
    marginLeft: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  presetText: {
    fontSize: 16,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  durationButton: {
    width: '48%',
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 16,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryText: {
    fontSize: 16,
  },
  summaryHighlight: {
    fontSize: 18,
  },
  summarySubtext: {
    fontSize: 14,
    marginLeft: 30,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 30,
  },
  startButtonText: {
    fontSize: 18,
  },
});
