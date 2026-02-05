import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, useColorScheme, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, endOfMonth, differenceInDays, addMonths, startOfMonth } from 'date-fns';

import Colors from '@/constants/colors';
import { usePushups } from '@/contexts/PushupContext';
import { getTodayDateString } from '@/lib/types';

const PRESET_GOALS = [1000, 2000, 5000, 10000];

function generateMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = addMonths(startOfMonth(now), i);
    options.push({
      label: format(date, 'MMMM yyyy'),
      value: format(endOfMonth(date), 'yyyy-MM-dd'),
      month: date.getMonth(),
      year: date.getFullYear(),
    });
  }
  return options;
}

export default function SetupScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { setGoal } = usePushups();

  const monthOptions = generateMonthOptions();
  const [goalAmount, setGoalAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string>(monthOptions[0].value);

  const handleSelectPreset = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPreset(amount);
    setGoalAmount(amount.toString());
  };

  const handleSelectEndDate = (dateValue: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEndDate(dateValue);
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
    if (!amount || amount < 1 || !selectedEndDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const startDate = getTodayDateString();

    await setGoal({
      totalGoal: amount,
      startDate,
      endDate: selectedEndDate,
    });

    router.back();
  };

  const daysRemaining = selectedEndDate 
    ? Math.max(1, differenceInDays(new Date(selectedEndDate), new Date()) + 1)
    : 0;

  const dailyAverage = goalAmount && daysRemaining
    ? Math.ceil(parseInt(goalAmount, 10) / daysRemaining)
    : 0;

  const isValid = goalAmount && parseInt(goalAmount, 10) > 0 && selectedEndDate;

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
            Complete by end of
          </Text>
          <View style={styles.monthGrid}>
            {monthOptions.slice(0, 6).map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleSelectEndDate(option.value)}
                style={({ pressed }) => [
                  styles.monthButton,
                  {
                    backgroundColor: selectedEndDate === option.value ? colors.tint : colors.card,
                    borderColor: selectedEndDate === option.value ? colors.tint : colors.border,
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text
                  style={[
                    styles.monthText,
                    {
                      color: selectedEndDate === option.value ? '#FFFFFF' : colors.text,
                      fontFamily: 'Inter_600SemiBold',
                    },
                  ]}
                >
                  {format(new Date(option.year, option.month), 'MMM')}
                </Text>
                <Text
                  style={[
                    styles.yearText,
                    {
                      color: selectedEndDate === option.value ? '#FFFFFF' : colors.textSecondary,
                      fontFamily: 'Inter_400Regular',
                    },
                  ]}
                >
                  {option.year}
                </Text>
              </Pressable>
            ))}
          </View>
          {monthOptions.length > 6 && (
            <View style={styles.monthGrid}>
              {monthOptions.slice(6).map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleSelectEndDate(option.value)}
                  style={({ pressed }) => [
                    styles.monthButton,
                    {
                      backgroundColor: selectedEndDate === option.value ? colors.tint : colors.card,
                      borderColor: selectedEndDate === option.value ? colors.tint : colors.border,
                    },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Text
                    style={[
                      styles.monthText,
                      {
                        color: selectedEndDate === option.value ? '#FFFFFF' : colors.text,
                        fontFamily: 'Inter_600SemiBold',
                      },
                    ]}
                  >
                    {format(new Date(option.year, option.month), 'MMM')}
                  </Text>
                  <Text
                    style={[
                      styles.yearText,
                      {
                        color: selectedEndDate === option.value ? '#FFFFFF' : colors.textSecondary,
                        fontFamily: 'Inter_400Regular',
                      },
                    ]}
                  >
                    {option.year}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
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
              {daysRemaining} days remaining • End: {format(new Date(selectedEndDate), 'MMMM d, yyyy')}
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
    paddingBottom: 20,
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
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  monthButton: {
    width: '31%',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  monthText: {
    fontSize: 16,
  },
  yearText: {
    fontSize: 12,
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
