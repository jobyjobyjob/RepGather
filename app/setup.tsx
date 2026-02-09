import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, useColorScheme, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, differenceInCalendarDays } from 'date-fns';

import Colors from '@/constants/colors';
import { usePushups } from '@/contexts/PushupContext';
import { EXERCISE_TYPES } from '@shared/schema';
import CalendarDateRangePicker from '@/components/CalendarDateRangePicker';

const PRESET_GOALS = [1000, 2000, 5000, 10000];

export default function SetupScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { createPersonalChallenge, setActiveChallenge } = usePushups();

  const [challengeName, setChallengeName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [exerciseType, setExerciseType] = useState('Push-ups');
  const [customExercise, setCustomExercise] = useState('');
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalDays = startDate && endDate
    ? differenceInCalendarDays(endDate, startDate) + 1
    : 0;

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

  const handleStartChallenge = async () => {
    const amount = parseInt(goalAmount, 10);
    if (!amount || amount < 1 || !startDate || !endDate || totalDays < 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const name = challengeName.trim() || `${effectiveExerciseType} Challenge`;
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      const challenge = await createPersonalChallenge({
        name,
        exerciseType: effectiveExerciseType,
        totalGoal: amount,
        startDate: startDateStr,
        endDate: endDateStr,
      });

      await setActiveChallenge(challenge.id);
      router.back();
    } catch (err) {
      console.error('Failed to create challenge:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setIsSubmitting(false);
  };

  const effectiveExerciseType = exerciseType === 'Other' ? (customExercise.trim() || 'Other') : exerciseType;

  const dailyAverage = goalAmount && totalDays > 0
    ? Math.ceil(parseInt(goalAmount, 10) / totalDays)
    : 0;

  const isValid = goalAmount && parseInt(goalAmount, 10) > 0 && startDate && endDate && totalDays >= 1 && !isSubmitting && (exerciseType !== 'Other' || customExercise.trim().length > 0);

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
          New Personal Challenge
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
            Challenge Name
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.nameInput, { color: colors.text, fontFamily: 'Inter_500Medium' }]}
              value={challengeName}
              onChangeText={setChallengeName}
              placeholder={`e.g., ${effectiveExerciseType} Challenge`}
              placeholderTextColor={colors.textSecondary}
              maxLength={40}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            Exercise Type
          </Text>
          <Pressable
            onPress={() => setShowExercisePicker(!showExercisePicker)}
            style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}
          >
            <Ionicons name="fitness" size={20} color={colors.tint} style={{ marginRight: 10 }} />
            <Text style={[styles.nameInput, { color: colors.text, fontFamily: 'Inter_500Medium', flex: 1 }]}>{exerciseType}</Text>
            <Ionicons name={showExercisePicker ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
          </Pressable>
          {showExercisePicker && (
            <View style={[styles.pickerDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {EXERCISE_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    style={[
                      styles.pickerItem,
                      exerciseType === type && { backgroundColor: colors.tint + '15' },
                    ]}
                    onPress={() => {
                      setExerciseType(type);
                      setShowExercisePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, { color: exerciseType === type ? colors.tint : colors.text }]}>{type}</Text>
                    {exerciseType === type && <Ionicons name="checkmark" size={18} color={colors.tint} />}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          {exerciseType === 'Other' && (
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="create-outline" size={20} color={colors.tint} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.nameInput, { color: colors.text, fontFamily: 'Inter_500Medium', flex: 1 }]}
                value={customExercise}
                onChangeText={setCustomExercise}
                placeholder="Enter workout name"
                placeholderTextColor={colors.textSecondary}
                maxLength={30}
                autoFocus
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            Total Goal
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
              {effectiveExerciseType.toLowerCase()}
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
            Challenge Dates
          </Text>
          <CalendarDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onSelectStart={(d) => { setStartDate(d); setEndDate(null); }}
            onSelectEnd={setEndDate}
          />
        </View>

        {isValid && (
          <View style={[styles.summaryCard, { backgroundColor: colors.tint + '15' }]}>
            <View style={styles.summaryRow}>
              <Ionicons name="calculator" size={20} color={colors.tint} />
              <Text style={[styles.summaryText, { color: colors.text, fontFamily: 'Inter_500Medium' }]}>
                About {dailyAverage} {effectiveExerciseType.toLowerCase()} per day
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
  nameInput: { fontSize: 16, paddingVertical: 0 },
  input: { flex: 1, fontSize: 28, paddingVertical: 0 },
  inputSuffix: { fontSize: 16, marginLeft: 8 },
  presetRow: { flexDirection: 'row', gap: 10 },
  presetButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  presetText: { fontSize: 15 },
  pickerDropdown: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  pickerItemText: { fontSize: 15 },
  summaryCard: { padding: 18, borderRadius: 14, gap: 6 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryText: { fontSize: 15, flex: 1 },
  summarySubtext: { fontSize: 13, marginLeft: 30 },
  footer: { paddingHorizontal: 20, paddingTop: 16 },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 30 },
  startButtonText: { fontSize: 18 },
});
