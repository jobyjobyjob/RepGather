import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, useColorScheme, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import Colors from '@/constants/colors';
import { usePushups, Challenge } from '@/contexts/PushupContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProgressRing } from '@/components/ProgressRing';
import { CounterButton } from '@/components/CounterButton';
import { QuickAddButtons } from '@/components/QuickAddButtons';
import { ConfettiCelebration } from '@/components/ConfettiCelebration';

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

function AchievementModal({ visible, onComplete, onKeepGoing, onDelete, colors, exerciseLabel, totalCompleted, goalValue }: {
  visible: boolean;
  onComplete: () => void;
  onKeepGoing: () => void;
  onDelete: () => void;
  colors: any;
  exerciseLabel: string;
  totalCompleted: number;
  goalValue: number;
}) {
  const trophyScale = useSharedValue(0);
  const trophyRotate = useSharedValue(-15);

  useEffect(() => {
    if (visible) {
      trophyScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 120 }));
      trophyRotate.value = withDelay(200, withSequence(
        withTiming(15, { duration: 200 }),
        withTiming(-10, { duration: 200 }),
        withTiming(5, { duration: 150 }),
        withTiming(0, { duration: 150 })
      ));
    } else {
      trophyScale.value = 0;
      trophyRotate.value = -15;
    }
  }, [visible]);

  const trophyAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { rotate: `${trophyRotate.value}deg` },
    ],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={achieveStyles.overlay}>
        <View style={[achieveStyles.container, { backgroundColor: colors.card }]}>
          <Animated.View style={[achieveStyles.trophyContainer, trophyAnimStyle]}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={achieveStyles.trophyGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={achieveStyles.trophyEmoji}>{"\uD83C\uDFC6"}</Text>
            </LinearGradient>
          </Animated.View>

          <Text style={[achieveStyles.title, { color: colors.text }]}>
            You've achieved your goal! {"\uD83C\uDFC6"}
          </Text>
          <Text style={[achieveStyles.subtitle, { color: colors.textSecondary }]}>
            {totalCompleted.toLocaleString()} / {goalValue.toLocaleString()} {exerciseLabel}
          </Text>
          <Text style={[achieveStyles.question, { color: colors.text }]}>
            Would you like to:
          </Text>

          <View style={achieveStyles.optionsContainer}>
            <Pressable
              onPress={onComplete}
              style={({ pressed }) => [
                achieveStyles.optionButton,
                { backgroundColor: colors.success + '15', borderColor: colors.success },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={achieveStyles.optionEmoji}>{"\u2705"}</Text>
              <Text style={[achieveStyles.optionText, { color: colors.success }]}>
                Complete and save challenge
              </Text>
            </Pressable>

            <Pressable
              onPress={onKeepGoing}
              style={({ pressed }) => [
                achieveStyles.optionButton,
                { backgroundColor: colors.tint + '15', borderColor: colors.tint },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={achieveStyles.optionEmoji}>{"\uD83D\uDCAA"}</Text>
              <Text style={[achieveStyles.optionText, { color: colors.tint }]}>
                Keep Going!
              </Text>
            </Pressable>

            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [
                achieveStyles.optionButton,
                { backgroundColor: colors.error + '15', borderColor: colors.error },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={achieveStyles.optionEmoji}>{"\u274C"}</Text>
              <Text style={[achieveStyles.optionText, { color: colors.error }]}>
                Delete Challenge
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
    deleteChallenge, completeChallenge,
  } = usePushups();
  const { user } = useAuth();
  const [dayFinished, setDayFinished] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [goalCelebrated, setGoalCelebrated] = useState(false);
  const prevPercentRef = useRef<number>(0);

  const finishScale = useSharedValue(1);
  const finishAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: finishScale.value }],
  }));

  useEffect(() => {
    const currentPercent = progress?.percentComplete || 0;
    const prevPercent = prevPercentRef.current;

    if (currentPercent >= 100 && prevPercent < 100 && !goalCelebrated && activeChallenge) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowConfetti(true);
      setShowAchievementModal(true);
      setGoalCelebrated(true);
    }

    prevPercentRef.current = currentPercent;
  }, [progress?.percentComplete, goalCelebrated, activeChallenge]);

  useEffect(() => {
    setGoalCelebrated(false);
    prevPercentRef.current = 0;
  }, [activeChallengeId]);

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
    if (!dayFinished) {
      setDayFinished(true);
      const msg = getEncouragementMessage();
      Alert.alert(
        `${msg.text} ${msg.emoji}`,
        `You logged ${progress?.todayCount || 0} ${exerciseLabel} today!`,
        [{ text: 'Awesome!', onPress: () => {} }]
      );
    }
  };

  const handleChallengeSelect = (id: string) => {
    setDayFinished(false);
    setActiveChallenge(id);
  };

  const goalValue = activeChallenge
    ? (activeChallenge.goalType === 'individual' && activeChallenge.myIndividualGoal
      ? activeChallenge.myIndividualGoal
      : activeChallenge.totalGoal)
    : 0;

  const handleCompleteChallenge = async () => {
    setShowAchievementModal(false);
    setShowConfetti(false);
    if (activeChallenge) {
      await completeChallenge(activeChallenge.id);
    }
  };

  const handleKeepGoing = () => {
    setShowAchievementModal(false);
    setShowConfetti(false);
  };

  const handleDeleteChallenge = () => {
    setShowAchievementModal(false);
    setShowConfetti(false);
    if (activeChallenge) {
      Alert.alert(
        'Delete Challenge',
        'Are you sure? This will permanently delete the challenge and all its data.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteChallenge(activeChallenge.id),
          },
        ]
      );
    }
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
          exerciseLabel={exerciseLabel}
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
                  backgroundColor: dayFinished ? colors.success + '15' : colors.card,
                  borderColor: dayFinished ? colors.success : colors.border,
                },
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Ionicons
                name={dayFinished ? "checkmark-circle" : "checkmark-circle-outline"}
                size={24}
                color={dayFinished ? colors.success : colors.textSecondary}
              />
              <Text style={[
                styles.finishButtonText,
                {
                  color: dayFinished ? colors.success : colors.textSecondary,
                  fontFamily: 'Inter_600SemiBold',
                }
              ]}>
                {dayFinished ? 'Day Complete' : 'Finish Day'}
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

      </ScrollView>

      <ConfettiCelebration visible={showConfetti} />

      <AchievementModal
        visible={showAchievementModal}
        onComplete={handleCompleteChallenge}
        onKeepGoing={handleKeepGoing}
        onDelete={handleDeleteChallenge}
        colors={colors}
        exerciseLabel={exerciseLabel}
        totalCompleted={progress?.totalCompleted || 0}
        goalValue={goalValue}
      />
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const achieveStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: 'center',
  },
  trophyContainer: {
    marginBottom: 20,
  },
  trophyGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyEmoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginBottom: 16,
  },
  question: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
  },
  optionsContainer: {
    width: '100%',
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  optionEmoji: {
    fontSize: 20,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
});

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
