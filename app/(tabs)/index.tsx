import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, useColorScheme, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import Colors from '@/constants/colors';
import { getDailyGoalMessage } from '@/constants/dailyGoalMessages';
import { usePushups, Challenge } from '@/contexts/PushupContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProgressRing } from '@/components/ProgressRing';
import { QuickAddButtons } from '@/components/QuickAddButtons';
import { ConfettiCelebration } from '@/components/ConfettiCelebration';
import DailyBarChart from '@/components/DailyBarChart';

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

function DailyGoalModal({ visible, onDismiss, colors, message }: {
  visible: boolean;
  onDismiss: () => void;
  colors: any;
  message: string;
}) {
  const starScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      starScale.value = withDelay(100, withSpring(1, { damping: 8, stiffness: 120 }));
    } else {
      starScale.value = 0;
    }
  }, [visible]);

  const starAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={dailyGoalStyles.overlay}>
        <View style={[dailyGoalStyles.container, { backgroundColor: colors.card }]}>
          <Animated.View style={[dailyGoalStyles.iconContainer, starAnimStyle]}>
            <LinearGradient
              colors={['#34D399', '#10B981']}
              style={dailyGoalStyles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={dailyGoalStyles.iconEmoji}>⭐</Text>
            </LinearGradient>
          </Animated.View>

          <Text style={[dailyGoalStyles.title, { color: colors.text }]}>
            Daily Goal Reached!
          </Text>

          <Text style={[dailyGoalStyles.message, { color: colors.textSecondary }]}>
            {message}
          </Text>

          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [
              dailyGoalStyles.dismissButton,
              { backgroundColor: colors.tint },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={dailyGoalStyles.dismissButtonText}>
              Let's Go!
            </Text>
          </Pressable>
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
    logs, progress, logActivity, updateLog, setActiveChallenge,
    deleteChallenge, completeChallenge, refresh,
  } = usePushups();
  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [showDailyGoalModal, setShowDailyGoalModal] = useState(false);
  const [dailyGoalMessage, setDailyGoalMessage] = useState('');
  const [goalCelebrated, setGoalCelebrated] = useState(false);
  const prevPercentRef = useRef<number>(0);
  const [localCount, setLocalCount] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const finishScale = useSharedValue(1);
  const finishAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: finishScale.value }],
  }));

  const serverTodayCount = progress?.todayCount || 0;

  useEffect(() => {
    setLocalCount(serverTodayCount);
    setSavedCount(serverTodayCount);
  }, [serverTodayCount]);

  const challengeSwitchRef = useRef(false);

  useEffect(() => {
    challengeSwitchRef.current = true;
    setGoalCelebrated(false);
    prevPercentRef.current = 0;
    setLocalCount(null);
    setSavedCount(null);
  }, [activeChallengeId]);

  useEffect(() => {
    const currentPercent = progress?.percentComplete || 0;

    if (challengeSwitchRef.current) {
      prevPercentRef.current = currentPercent;
      challengeSwitchRef.current = false;
      return;
    }

    const prevPercent = prevPercentRef.current;

    if (currentPercent >= 100 && prevPercent < 100 && !goalCelebrated && activeChallenge) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowConfetti(true);
      setShowAchievementModal(true);
      setGoalCelebrated(true);
    }

    prevPercentRef.current = currentPercent;
  }, [progress?.percentComplete, goalCelebrated, activeChallenge]);

  const currentCount = localCount ?? serverTodayCount;
  const hasUnsavedChanges = localCount !== null && localCount !== savedCount;

  const handleIncrement = () => {
    setLocalCount((prev) => (prev ?? serverTodayCount) + 1);
  };

  const handleDecrement = () => {
    setLocalCount((prev) => Math.max(0, (prev ?? serverTodayCount) - 1));
  };

  const handleQuickAdd = (count: number) => {
    setLocalCount((prev) => (prev ?? serverTodayCount) + count);
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

  const handleSaveDay = async () => {
    if (!hasUnsavedChanges || localCount === null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    finishScale.value = withSequence(
      withSpring(1.1, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    await updateLog(today, localCount);
    setSavedCount(localCount);

    const target = progress?.dynamicDailyTarget || 0;
    if (target > 0 && localCount >= target) {
      setDailyGoalMessage(getDailyGoalMessage());
      setShowDailyGoalModal(true);
    }
  };

  const handleChallengeSelect = (id: string) => {
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
  const todayProgress = dynamicTarget > 0 ? Math.min(100, (currentCount / dynamicTarget) * 100) : 0;
  const todayComplete = dynamicTarget > 0 && currentCount >= dynamicTarget;
  const dayIsSaved = !hasUnsavedChanges && currentCount > 0;
  const showDailyTarget = !dayIsSaved;
  const isDebtActive = progress?.isDebtActive || false;

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
            {currentCount === 0 ? "Let's get started!" : todayComplete ? "Target reached!" : "Keep pushing!"}
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
            progress={Math.min(100, progress?.percentComplete || 0)}
            size={200}
            strokeWidth={16}
            progressColor={colors.tint}
            backgroundColor={colors.progressBackground}
          >
            <Text style={[styles.progressPercent, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
              {Math.min(100, Math.round(progress?.percentComplete || 0))}%
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              of goal
            </Text>
          </ProgressRing>
          <Text style={[styles.totalProgress, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            {progress?.totalCompleted.toLocaleString()} / {goalValue.toLocaleString()} {exerciseLabel}
          </Text>
        </View>

        {showDailyTarget && (
          <View style={[styles.dailyCard, { backgroundColor: colors.card }]}>
            <View style={styles.dailyHeader}>
              <Text style={[styles.dailyTitle, { color: isDebtActive ? '#F59E0B' : colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                {isDebtActive ? 'Adjusted Goal' : "Today's Target"}
              </Text>
              <View style={[styles.targetBadge, { backgroundColor: todayComplete ? colors.success + '20' : isDebtActive ? '#F59E0B20' : colors.tint + '20' }]}>
                <Text style={[styles.targetText, { color: todayComplete ? colors.success : isDebtActive ? '#F59E0B' : colors.tint, fontFamily: 'Inter_600SemiBold' }]}>
                  {dynamicTarget} needed
                </Text>
              </View>
            </View>

            {isDebtActive && !todayComplete && (
              <Text style={[styles.debtCaption, { color: '#F59E0B' }]}>
                Adjusted to keep you on track.
              </Text>
            )}

            <View style={styles.todayProgressBar}>
              <View style={[styles.progressTrack, { backgroundColor: colors.progressBackground }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: todayComplete ? colors.success : isDebtActive ? '#F59E0B' : colors.tint,
                      width: `${Math.min(100, todayProgress)}%`,
                    }
                  ]}
                />
              </View>
              <Text style={[styles.todayProgressText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                {currentCount} / {dynamicTarget}
                {todayComplete && ' - Complete!'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.counterSection}>
          <View style={styles.counterRow}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleDecrement();
              }}
              style={({ pressed }) => [
                styles.adjustButton,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
              ]}
            >
              <Ionicons name="remove" size={28} color={colors.text} />
            </Pressable>

            <View style={styles.counterCenter}>
              <Text style={[styles.counterValue, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
                {currentCount}
              </Text>
              <Text style={[styles.counterLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                today
              </Text>
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleIncrement();
              }}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: colors.tint },
                pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
              ]}
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text style={[styles.counterHint, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Tap +/- to adjust {exerciseLabel}
          </Text>
        </View>

        <QuickAddButtons
          onAdd={handleQuickAdd}
          backgroundColor={colors.card}
          textColor={colors.text}
          accentColor={colors.tint}
        />

        <Animated.View style={finishAnimStyle}>
          <Pressable
            onPress={handleSaveDay}
            disabled={!hasUnsavedChanges}
            style={({ pressed }) => [
              styles.finishButton,
              hasUnsavedChanges
                ? { backgroundColor: colors.tint, borderColor: colors.tint }
                : { backgroundColor: colors.success + '15', borderColor: colors.success },
              pressed && hasUnsavedChanges && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              !hasUnsavedChanges && { opacity: 0.9 },
            ]}
          >
            <Ionicons
              name={hasUnsavedChanges ? "checkmark-circle-outline" : "checkmark-circle"}
              size={24}
              color={hasUnsavedChanges ? '#FFFFFF' : colors.success}
            />
            <Text style={[
              styles.finishButtonText,
              {
                color: hasUnsavedChanges ? '#FFFFFF' : colors.success,
                fontFamily: 'Inter_600SemiBold',
              }
            ]}>
              {hasUnsavedChanges ? 'Complete Day' : 'Day Completed'}
            </Text>
          </Pressable>
        </Animated.View>

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

        {activeChallenge && (
          <DailyBarChart
            logs={logs}
            startDate={activeChallenge.startDate}
            endDate={activeChallenge.endDate}
            colors={colors}
            exerciseLabel={exerciseLabel}
            futureTargets={progress?.futureTargets}
            dynamicDailyTarget={progress?.dynamicDailyTarget}
          />
        )}

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

      <DailyGoalModal
        visible={showDailyGoalModal}
        onDismiss={() => setShowDailyGoalModal(false)}
        colors={colors}
        message={dailyGoalMessage}
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

const dailyGoalStyles = StyleSheet.create({
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
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  dismissButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
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
  debtCaption: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
    marginBottom: -4,
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
  counterSection: {
    alignItems: 'center',
    gap: 12,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  counterCenter: {
    alignItems: 'center',
    minWidth: 100,
  },
  counterValue: {
    fontSize: 56,
    lineHeight: 64,
  },
  counterLabel: {
    fontSize: 15,
    marginTop: -4,
  },
  adjustButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  counterHint: {
    fontSize: 13,
  },
});
