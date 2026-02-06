import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, useColorScheme, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, endOfMonth, differenceInDays, addMonths, startOfMonth, getDaysInMonth } from 'date-fns';

import Colors from '@/constants/colors';
import { usePushups } from '@/contexts/PushupContext';
import { PlanType } from '@/lib/types';

const PRESET_GOALS = [1000, 2000, 5000, 10000];

const PLAN_OPTIONS: { type: PlanType; label: string; description: string }[] = [
  { type: 'average', label: 'Average', description: 'Same amount each day' },
  { type: 'increasing', label: 'Increasing', description: 'More each week' },
  { type: 'custom', label: 'Custom', description: 'Fixed daily target' },
];

function generateMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = addMonths(startOfMonth(now), i);
    options.push({
      label: format(date, 'MMMM yyyy'),
      month: date.getMonth(),
      year: date.getFullYear(),
      daysInMonth: getDaysInMonth(date),
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
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(monthOptions[0].daysInMonth);
  const [planType, setPlanType] = useState<PlanType>('average');
  const [customDailyTarget, setCustomDailyTarget] = useState('');

  const selectedMonth = monthOptions[selectedMonthIndex];
  const daysArray = useMemo(() => {
    return Array.from({ length: selectedMonth.daysInMonth }, (_, i) => i + 1);
  }, [selectedMonth.daysInMonth]);

  const startDateStr = `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
  const endDateStr = `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  const totalDays = endDay - startDay + 1;

  const handleSelectMonth = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMonthIndex(index);
    setStartDay(1);
    setEndDay(monthOptions[index].daysInMonth);
  };

  const handleSelectPreset = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPreset(amount);
    setGoalAmount(amount.toString());
  };

  const handleGoalChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText === '' || numericText === '0') {
      setGoalAmount('');
      setSelectedPreset(null);
      return;
    }
    const cleanedText = numericText.replace(/^0+/, '') || '';
    setGoalAmount(cleanedText);
    const num = parseInt(cleanedText, 10);
    setSelectedPreset(PRESET_GOALS.includes(num) ? num : null);
  };

  const handleCustomTargetChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText === '' || numericText === '0') {
      setCustomDailyTarget('');
      return;
    }
    setCustomDailyTarget(numericText.replace(/^0+/, '') || '');
  };

  const handleStartChallenge = async () => {
    const amount = parseInt(goalAmount, 10);
    if (!amount || amount < 1 || totalDays < 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (planType === 'custom' && !customDailyTarget) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await setGoal({
      totalGoal: amount,
      startDate: startDateStr,
      endDate: endDateStr,
      planType,
      customDailyTarget: planType === 'custom' ? parseInt(customDailyTarget, 10) : undefined,
    });

    router.back();
  };

  const dailyAverage = goalAmount && totalDays > 0
    ? Math.ceil(parseInt(goalAmount, 10) / totalDays)
    : 0;

  const isValid = goalAmount && parseInt(goalAmount, 10) > 0 && totalDays >= 1 &&
    (planType !== 'custom' || (customDailyTarget && parseInt(customDailyTarget, 10) > 0));

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
              placeholder="Enter goal"
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
                <Text style={[styles.presetText, { color: selectedPreset === amount ? '#FFFFFF' : colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                  {amount >= 1000 ? `${amount / 1000}K` : amount}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            Select Month
          </Text>
          <View style={styles.monthGrid}>
            {monthOptions.slice(0, 6).map((option, i) => (
              <Pressable
                key={i}
                onPress={() => handleSelectMonth(i)}
                style={({ pressed }) => [
                  styles.monthButton,
                  {
                    backgroundColor: selectedMonthIndex === i ? colors.tint : colors.card,
                    borderColor: selectedMonthIndex === i ? colors.tint : colors.border,
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={[styles.monthText, { color: selectedMonthIndex === i ? '#FFFFFF' : colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                  {format(new Date(option.year, option.month), 'MMM')}
                </Text>
                <Text style={[styles.yearText, { color: selectedMonthIndex === i ? '#FFFFFF' : colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  {option.year}
                </Text>
              </Pressable>
            ))}
          </View>
          {monthOptions.length > 6 && (
            <View style={styles.monthGrid}>
              {monthOptions.slice(6).map((option, idx) => {
                const i = idx + 6;
                return (
                  <Pressable
                    key={i}
                    onPress={() => handleSelectMonth(i)}
                    style={({ pressed }) => [
                      styles.monthButton,
                      {
                        backgroundColor: selectedMonthIndex === i ? colors.tint : colors.card,
                        borderColor: selectedMonthIndex === i ? colors.tint : colors.border,
                      },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <Text style={[styles.monthText, { color: selectedMonthIndex === i ? '#FFFFFF' : colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                      {format(new Date(option.year, option.month), 'MMM')}
                    </Text>
                    <Text style={[styles.yearText, { color: selectedMonthIndex === i ? '#FFFFFF' : colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      {option.year}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            Start Date
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dayRow}>
              {daysArray.map((day) => {
                const isSelected = day === startDay;
                const isDisabled = day > endDay;
                return (
                  <Pressable
                    key={day}
                    onPress={() => {
                      if (!isDisabled) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setStartDay(day);
                      }
                    }}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: isSelected ? colors.tint : colors.card,
                        borderColor: isSelected ? colors.tint : colors.border,
                        opacity: isDisabled ? 0.3 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.dayButtonText, { color: isSelected ? '#FFFFFF' : colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            End Date
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dayRow}>
              {daysArray.map((day) => {
                const isSelected = day === endDay;
                const isDisabled = day < startDay;
                return (
                  <Pressable
                    key={day}
                    onPress={() => {
                      if (!isDisabled) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEndDay(day);
                      }
                    }}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: isSelected ? colors.tint : colors.card,
                        borderColor: isSelected ? colors.tint : colors.border,
                        opacity: isDisabled ? 0.3 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.dayButtonText, { color: isSelected ? '#FFFFFF' : colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Text style={[styles.dateHint, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            {format(new Date(selectedMonth.year, selectedMonth.month, startDay), 'MMM d')} - {format(new Date(selectedMonth.year, selectedMonth.month, endDay), 'MMM d, yyyy')} ({totalDays} days)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            Daily Plan
          </Text>
          <View style={styles.planOptions}>
            {PLAN_OPTIONS.map((option) => (
              <Pressable
                key={option.type}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPlanType(option.type);
                }}
                style={({ pressed }) => [
                  styles.planOption,
                  {
                    backgroundColor: planType === option.type ? colors.tint + '15' : colors.card,
                    borderColor: planType === option.type ? colors.tint : colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.planRadio}>
                  <View style={[styles.radioOuter, { borderColor: planType === option.type ? colors.tint : colors.textSecondary }]}>
                    {planType === option.type && (
                      <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />
                    )}
                  </View>
                </View>
                <View style={styles.planContent}>
                  <Text style={[styles.planLabel, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.planDescription, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    {option.description}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          {planType === 'custom' && (
            <View style={[styles.customInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.customInput, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}
                value={customDailyTarget}
                onChangeText={handleCustomTargetChange}
                placeholder="Daily target"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={4}
              />
              <Text style={[styles.inputSuffix, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                per day
              </Text>
            </View>
          )}
        </View>

        {isValid && (
          <View style={[styles.summaryCard, { backgroundColor: colors.tint + '15' }]}>
            <View style={styles.summaryRow}>
              <Ionicons name="calculator" size={20} color={colors.tint} />
              <Text style={[styles.summaryText, { color: colors.text, fontFamily: 'Inter_500Medium' }]}>
                {planType === 'custom'
                  ? `Fixed target: ${customDailyTarget} push-ups/day`
                  : planType === 'increasing'
                  ? `Starts at ~${Math.ceil(dailyAverage * 0.7)}, builds to ~${Math.ceil(dailyAverage * 1.5)}/day`
                  : `About ${dailyAverage} push-ups per day`
                }
              </Text>
            </View>
            <Text style={[styles.summarySubtext, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {totalDays} days total
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
            { backgroundColor: isValid ? colors.tint : colors.progressBackground },
            pressed && isValid && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={[styles.startButtonText, { color: isValid ? '#FFFFFF' : colors.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
            Start Challenge
          </Text>
          <Ionicons name="arrow-forward" size={20} color={isValid ? '#FFFFFF' : colors.textSecondary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18 },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 24, paddingBottom: 20 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 16 },
  input: { flex: 1, fontSize: 28, paddingVertical: 0 },
  inputSuffix: { fontSize: 16, marginLeft: 8 },
  presetRow: { flexDirection: 'row', gap: 10 },
  presetButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  presetText: { fontSize: 15 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  monthButton: { width: '31%', paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 2 },
  monthText: { fontSize: 15 },
  yearText: { fontSize: 11 },
  dayRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  dayButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayButtonText: { fontSize: 15 },
  dateHint: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  planOptions: { gap: 10 },
  planOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1, gap: 14 },
  planRadio: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  planContent: { flex: 1, gap: 2 },
  planLabel: { fontSize: 16 },
  planDescription: { fontSize: 13 },
  customInputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, marginTop: 4 },
  customInput: { flex: 1, fontSize: 20, paddingVertical: 0 },
  summaryCard: { padding: 18, borderRadius: 14, gap: 6 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryText: { fontSize: 15, flex: 1 },
  summarySubtext: { fontSize: 13, marginLeft: 30 },
  footer: { paddingHorizontal: 20, paddingTop: 16 },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 30 },
  startButtonText: { fontSize: 18 },
});
