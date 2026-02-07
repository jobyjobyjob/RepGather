import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, useColorScheme, Platform, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';

import Colors from '@/constants/colors';
import { usePushups, Challenge } from '@/contexts/PushupContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProgressRing } from '@/components/ProgressRing';
import { CounterButton } from '@/components/CounterButton';
import { QuickAddButtons } from '@/components/QuickAddButtons';
import { MonthCalendar } from '@/components/MonthCalendar';

function ChallengePicker({ challenges, activeChallengeId, onSelect, colors }: {
  challenges: Challenge[];
  activeChallengeId: string | null;
  onSelect: (id: string) => void;
  colors: any;
}) {
  if (challenges.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.challengePickerContent}
      style={styles.challengePickerScroll}
    >
      {challenges.map((challenge) => {
        const isActive = challenge.id === activeChallengeId;
        return (
          <Pressable
            key={challenge.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(challenge.id);
            }}
            style={[
              styles.challengeChip,
              {
                backgroundColor: isActive ? colors.tint : colors.card,
                borderColor: isActive ? colors.tint : colors.border,
              },
            ]}
          >
            <Ionicons
              name={challenge.isPersonal ? "person" : "people"}
              size={14}
              color={isActive ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.challengeChipText,
                {
                  color: isActive ? '#FFFFFF' : colors.text,
                  fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_500Medium',
                },
              ]}
              numberOfLines={1}
            >
              {challenge.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function TodayScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const {
    isLoading, challenges, activeChallengeId, activeChallenge,
    logs, progress, logActivity, setActiveChallenge,
  } = usePushups();
  const { user } = useAuth();
  const [dayFinished, setDayFinished] = useState(false);

  const finishScale = useSharedValue(1);
  const finishAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: finishScale.value }],
  }));

  const handleIncrement = () => {
    logActivity(1);
  };

  const handleQuickAdd = (count: number) => {
    logActivity(count);
  };

  const exerciseLabel = activeChallenge?.exerciseType?.toLowerCase() || 'reps';

  const getEncouragementMessage = () => {
    const todayDone = progress?.todayCount || 0;
    const target = progress?.dynamicDailyTarget || 0;
    const pctDone = progress?.percentComplete || 0;

    if (todayDone >= target && target > 0) {
      const successMessages = [
        { text: "Let's Go!!!", emoji: "\uD83E\uDD1C\uD83E\uDD1B" },
        { text: "Crushed it!", emoji: "\uD83D\uDD25" },
        { text: "Beast mode!", emoji: "\uD83E\uDDB5" },
        { text: "On fire today!", emoji: "\u26A1" },
        { text: "Unstoppable!", emoji: "\uD83D\uDE80" },
        { text: "Champion vibes!", emoji: "\uD83C\uDFC6" },
      ];
      return successMessages[Math.floor(Math.random() * successMessages.length)];
    } else if (pctDone >= 75) {
      const nearMessages = [
        { text: "Almost there!", emoji: "\uD83C\uDFAF" },
        { text: "So close!", emoji: "\uD83D\uDCAA" },
        { text: "Keep pushing!", emoji: "\uD83D\uDE4C" },
      ];
      return nearMessages[Math.floor(Math.random() * nearMessages.length)];
    } else {
      const underMessages = [
        { text: "You got this!", emoji: "\uD83D\uDCAA" },
        { text: "Every rep counts!", emoji: "\u2B50" },
        { text: "Stay strong!", emoji: "\uD83D\uDCAF" },
        { text: "Keep going!", emoji: "\uD83C\uDF1F" },
      ];
      return underMessages[Math.floor(Math.random() * underMessages.length)];
    }
  };

  const handleFinishDay = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    finishScale.value = withSequence(
      withSpring(1.1, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    setDayFinished(true);
    const msg = getEncouragementMessage();
    Alert.alert(
      `${msg.text} ${msg.emoji}`,
      `You logged ${progress?.todayCount || 0} ${exerciseLabel} today!`,
      [{ text: 'Awesome!', onPress: () => {} }]
    );
  };

  const handleChallengeSelect = (id: string) => {
    setDayFinished(false);
    setActiveChallenge(id);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (challenges.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyState, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.tint + '20' }]}>
            <Ionicons name="fitness" size={48} color={colors.tint} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
            Start Your First Challenge
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Create a personal challenge or join a group to start tracking your fitness goals.
          </Text>
          <Pressable
            onPress={() => router.push('/setup')}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: colors.tint },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={[styles.startButtonText, { fontFamily: 'Inter_600SemiBold' }]}>Create Challenge</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    );
  }

  if (!activeChallenge) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16),
              paddingBottom: Platform.OS === 'web' ? 118 : 100,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              {getGreeting()}{user ? `, ${user.displayName}` : ''}
            </Text>
            <Text style={[styles.title, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
              Select a challenge
            </Text>
          </View>

          <ChallengePicker
            challenges={challenges}
            activeChallengeId={null}
            onSelect={handleChallengeSelect}
            colors={colors}
          />

          <View style={[styles.selectPromptCard, { backgroundColor: colors.card }]}>
            <Ionicons name="hand-left-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.selectPromptText, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Tap a challenge above to start tracking
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const goalValue = activeChallenge.goalType === 'individual' && activeChallenge.myIndividualGoal
    ? activeChallenge.myIndividualGoal
    : activeChallenge.totalGoal;

  const dynamicTarget = progress?.dynamicDailyTarget || 0;
  const todayCount = progress?.todayCount || 0;
  const todayProgress = dynamicTarget > 0 ? Math.min(100, (todayCount / dynamicTarget) * 100) : 0;
  const todayComplete = dynamicTarget > 0 && todayCount >= dynamicTarget;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16),
            paddingBottom: Platform.OS === 'web' ? 118 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            {getGreeting()}{user ? `, ${user.displayName}` : ''}
          </Text>
          <Text style={[styles.title, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
            {todayCount === 0 ? "Let's get started!" : todayComplete ? "Target reached!" : "Keep pushing!"}
          </Text>
        </View>

        <ChallengePicker
          challenges={challenges}
          activeChallengeId={activeChallengeId}
          onSelect={handleChallengeSelect}
          colors={colors}
        />

        <View style={styles.progressSection}>
          <ProgressRing
            progress={progress?.percentComplete || 0}
            size={200}
            strokeWidth={16}
            progressColor={colors.tint}
            backgroundColor={colors.progressBackground}
          >
            <Text style={[styles.progressPercent, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
              {Math.round(progress?.percentComplete || 0)}%
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              of goal
            </Text>
          </ProgressRing>
          <Text style={[styles.totalProgress, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            {progress?.totalCompleted.toLocaleString()} / {goalValue.toLocaleString()} {exerciseLabel}
          </Text>
        </View>

        <View style={[styles.dailyCard, { backgroundColor: colors.card }]}>
          <View style={styles.dailyHeader}>
            <Text style={[styles.dailyTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
              Today's Target
            </Text>
            <View style={[styles.targetBadge, { backgroundColor: todayComplete ? colors.success + '20' : colors.tint + '20' }]}>
              <Text style={[styles.targetText, { color: todayComplete ? colors.success : colors.tint, fontFamily: 'Inter_600SemiBold' }]}>
                {dynamicTarget} needed
              </Text>
            </View>
          </View>

          <View style={styles.todayProgressBar}>
            <View style={[styles.progressTrack, { backgroundColor: colors.progressBackground }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: todayComplete ? colors.success : colors.tint,
                    width: `${Math.min(100, todayProgress)}%`,
                  }
                ]}
              />
            </View>
            <Text style={[styles.todayProgressText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {todayCount} / {dynamicTarget}
              {todayComplete && ' - Complete!'}
            </Text>
          </View>
        </View>

        <CounterButton
          count={todayCount}
          onIncrement={handleIncrement}
          tintColor={colors.tint}
          textColor={colors.text}
        />

        <QuickAddButtons
          onAdd={handleQuickAdd}
          backgroundColor={colors.card}
          textColor={colors.text}
          accentColor={colors.tint}
        />

        {todayCount > 0 && (
          <Animated.View style={finishAnimStyle}>
            <Pressable
              onPress={handleFinishDay}
              style={({ pressed }) => [
                styles.finishButton,
                {
                  backgroundColor: dayFinished ? colors.success : colors.card,
                  borderColor: dayFinished ? colors.success : colors.success,
                },
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Ionicons
                name={dayFinished ? "checkmark-circle" : "checkmark-circle-outline"}
                size={24}
                color={dayFinished ? '#FFFFFF' : colors.success}
              />
              <Text style={[
                styles.finishButtonText,
                {
                  color: dayFinished ? '#FFFFFF' : colors.success,
                  fontFamily: 'Inter_600SemiBold',
                }
              ]}>
                {dayFinished ? 'Day Complete!' : 'Finish Day'}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="flame" size={22} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
              {progress?.streak || 0} days
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Streak
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="time" size={22} color={colors.tint} />
            <Text style={[styles.statValue, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
              {progress?.daysRemaining || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Days Left
            </Text>
          </View>
        </View>

        <MonthCalendar
          goal={{
            id: activeChallenge.id,
            totalGoal: goalValue,
            startDate: activeChallenge.startDate,
            endDate: activeChallenge.endDate,
            planType: 'average' as const,
            createdAt: '',
          }}
          logs={logs.map(l => ({ ...l, createdAt: '' }))}
          colors={colors}
        />
      </ScrollView>
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 24,
  },
  header: {
    gap: 4,
  },
  greeting: {
    fontSize: 16,
  },
  title: {
    fontSize: 28,
  },
  challengePickerScroll: {
    marginHorizontal: -20,
  },
  challengePickerContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  challengeChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  challengeChipText: {
    fontSize: 14,
    maxWidth: 120,
  },
  selectPromptCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center' as const,
    gap: 12,
  },
  selectPromptText: {
    fontSize: 15,
    textAlign: 'center' as const,
  },
  progressSection: {
    alignItems: 'center',
    gap: 16,
  },
  progressPercent: {
    fontSize: 48,
  },
  progressLabel: {
    fontSize: 14,
    marginTop: -4,
  },
  totalProgress: {
    fontSize: 16,
  },
  dailyCard: {
    padding: 20,
    borderRadius: 20,
    gap: 16,
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyTitle: {
    fontSize: 18,
  },
  targetBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  targetText: {
    fontSize: 14,
  },
  todayProgressBar: {
    gap: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  todayProgressText: {
    fontSize: 14,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center' as const,
    gap: 6,
  },
  statValue: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 24,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 16,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
  },
  finishButtonText: {
    fontSize: 18,
  },
});
