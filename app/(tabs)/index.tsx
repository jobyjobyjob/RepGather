import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, useColorScheme, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import Colors from '@/constants/colors';
import { usePushups } from '@/contexts/PushupContext';
import { ProgressRing } from '@/components/ProgressRing';
import { CounterButton } from '@/components/CounterButton';
import { StatCard } from '@/components/StatCard';
import { QuickAddButtons } from '@/components/QuickAddButtons';

export default function TodayScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { isLoading, goal, progress, logPushups } = usePushups();

  const handleIncrement = () => {
    logPushups(1);
  };

  const handleQuickAdd = (count: number) => {
    logPushups(count);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyState, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.tint + '20' }]}>
            <Ionicons name="fitness" size={48} color={colors.tint} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
            Start Your Challenge
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Set a push-up goal and track your progress towards becoming stronger every day.
          </Text>
          <Pressable
            onPress={() => router.push('/setup')}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: colors.tint },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={[styles.startButtonText, { fontFamily: 'Inter_600SemiBold' }]}>Set Your Goal</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    );
  }

  const todayProgress = progress ? Math.min(100, (progress.todayCount / progress.dailyTarget) * 100) : 0;

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
            {getGreeting()}
          </Text>
          <Text style={[styles.title, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
            {progress?.todayCount === 0 ? "Let's get started!" : "Keep pushing!"}
          </Text>
        </View>

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
            {progress?.totalCompleted.toLocaleString()} / {goal.totalGoal.toLocaleString()} push-ups
          </Text>
        </View>

        <View style={[styles.dailyCard, { backgroundColor: colors.card }]}>
          <View style={styles.dailyHeader}>
            <Text style={[styles.dailyTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
              Today's Target
            </Text>
            <View style={[styles.targetBadge, { backgroundColor: colors.tint + '20' }]}>
              <Text style={[styles.targetText, { color: colors.tint, fontFamily: 'Inter_600SemiBold' }]}>
                {progress?.dailyTarget || 0} push-ups
              </Text>
            </View>
          </View>
          
          <View style={styles.todayProgressBar}>
            <View style={[styles.progressTrack, { backgroundColor: colors.progressBackground }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: todayProgress >= 100 ? colors.success : colors.tint,
                    width: `${Math.min(100, todayProgress)}%`,
                  }
                ]} 
              />
            </View>
            <Text style={[styles.todayProgressText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {progress?.todayCount || 0} / {progress?.dailyTarget || 0}
            </Text>
          </View>
        </View>

        <CounterButton
          count={progress?.todayCount || 0}
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

        <View style={styles.statsRow}>
          <StatCard
            icon="flame"
            label="Streak"
            value={`${progress?.streak || 0} days`}
            accentColor={colors.accent}
            backgroundColor={colors.card}
            textColor={colors.text}
            textSecondary={colors.textSecondary}
          />
          <StatCard
            icon="time"
            label="Days Left"
            value={progress?.daysRemaining || 0}
            accentColor={colors.tint}
            backgroundColor={colors.card}
            textColor={colors.text}
            textSecondary={colors.textSecondary}
          />
        </View>
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
});
