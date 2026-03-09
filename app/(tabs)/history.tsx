import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, useColorScheme, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  isAfter,
} from 'date-fns';

import Colors from '@/constants/colors';
import { usePushups, Challenge } from '@/contexts/PushupContext';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
        const isArchived = challenge.status === 'archived' || challenge.status === 'completed';
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
                opacity: isArchived && !isActive ? 0.65 : 1,
              },
            ]}
          >
            <Ionicons
              name={isArchived ? "archive" : (challenge.isPersonal ? "person" : "people")}
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

function MonthCalendar({ month, logs, onDayPress, colors, challengeStartDate, challengeEndDate, futureTargets }: {
  month: Date;
  logs: Array<{ id: string; date: string; count: number }>;
  onDayPress: (date: string) => void;
  colors: any;
  challengeStartDate?: string;
  challengeEndDate?: string;
  futureTargets?: Map<string, number>;
}) {
  const today = new Date();

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [month]);

  const logMap = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach(log => map.set(log.date, log.count));
    return map;
  }, [logs]);

  const chalStart = challengeStartDate ? parseISO(challengeStartDate) : null;
  const chalEnd = challengeEndDate ? parseISO(challengeEndDate) : null;

  return (
    <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.calCell}>
            <Text style={[styles.weekdayText, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((day, index) => {
          const inCurrentMonth = isSameMonth(day, month);
          const dateStr = format(day, 'yyyy-MM-dd');
          const count = logMap.get(dateStr) || 0;
          const hasActivity = count > 0;
          const isToday = isSameDay(day, today);
          const isFuture = isAfter(day, today);
          const futureTarget = isFuture && futureTargets ? futureTargets.get(dateStr) : undefined;

          const inChallengeRange = chalStart && chalEnd
            ? (isSameDay(day, chalStart) || isAfter(day, chalStart)) && (isSameDay(day, chalEnd) || isBefore(day, chalEnd))
            : true;

          return (
            <Pressable
              key={index}
              onPress={() => {
                if (inCurrentMonth && inChallengeRange) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onDayPress(dateStr);
                }
              }}
              style={styles.calCell}
            >
              <View style={[
                styles.calDayOuter,
                hasActivity && inCurrentMonth && { backgroundColor: colors.tint },
                isToday && !hasActivity && inCurrentMonth && { borderWidth: 1.5, borderColor: colors.tint },
                !inCurrentMonth && { opacity: 0.2 },
                inCurrentMonth && !inChallengeRange && { opacity: 0.3 },
              ]}>
                <Text style={[
                  styles.calDayText,
                  { fontFamily: 'Inter_500Medium' },
                  inCurrentMonth ? { color: colors.text } : { color: colors.textSecondary },
                  hasActivity && inCurrentMonth && { color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
                ]}>
                  {format(day, 'd')}
                </Text>
              </View>
              {hasActivity && inCurrentMonth && (
                <Text style={[styles.calDayCount, { color: colors.tint, fontFamily: 'Inter_600SemiBold' }]}>
                  {count}
                </Text>
              )}
              {!hasActivity && futureTarget != null && futureTarget > 0 && inCurrentMonth && inChallengeRange && (
                <Text style={[styles.calDayCount, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  {futureTarget}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { isLoading, challenges, activeChallengeId, activeChallenge, logs, progress, setActiveChallenge, refresh } = usePushups();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const exerciseLabel = activeChallenge?.exerciseType?.toLowerCase() || 'reps';

  const handleEditLog = (date: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/edit-log', params: { date } });
  };

  const handleChallengeSelect = (id: string) => {
    setActiveChallenge(id);
  };

  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(addMonths(currentMonth, 1));
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
          <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            Create a challenge to see your history
          </Text>
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
          <Text style={[styles.title, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
            Your Progress
          </Text>
          <ChallengePicker
            challenges={challenges}
            activeChallengeId={null}
            onSelect={handleChallengeSelect}
            colors={colors}
          />
          <View style={[styles.selectPrompt, { backgroundColor: colors.card }]}>
            <Text style={[styles.selectPromptText, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Select a challenge above to view history
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const sortedLogs = [...logs].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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
        <Text style={[styles.title, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
          Your Progress
        </Text>

        <ChallengePicker
          challenges={challenges}
          activeChallengeId={activeChallengeId}
          onSelect={handleChallengeSelect}
          colors={colors}
        />

        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.tint, fontFamily: 'Inter_700Bold' }]}>
                {progress?.totalCompleted.toLocaleString() || 0}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Total {exerciseLabel}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.accent, fontFamily: 'Inter_700Bold' }]}>
                {logs.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Days Active
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>
                {progress?.streak || 0}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Day Streak
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.monthNavRow}>
            <Pressable onPress={handlePrevMonth} style={styles.monthNavBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            <Pressable onPress={handleNextMonth} style={styles.monthNavBtn}>
              <Ionicons name="chevron-forward" size={22} color={colors.text} />
            </Pressable>
          </View>
          <MonthCalendar
            month={currentMonth}
            logs={logs}
            onDayPress={handleEditLog}
            colors={colors}
            challengeStartDate={activeChallenge.startDate}
            challengeEndDate={activeChallenge.endDate}
            futureTargets={progress?.futureTargets}
          />
          <Text style={[styles.calHint, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Tap any day to edit
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            Activity Log
          </Text>
          {sortedLogs.length === 0 ? (
            <View style={[styles.emptyLog, { backgroundColor: colors.card }]}>
              <Text style={[styles.emptyLogText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                No activity yet. Start logging your {exerciseLabel}!
              </Text>
            </View>
          ) : (
            <View style={styles.logList}>
              {sortedLogs.map((log) => (
                <Pressable
                  key={log.id}
                  style={({ pressed }) => [
                    styles.logItem,
                    { backgroundColor: colors.card },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => handleEditLog(log.date)}
                >
                  <View style={styles.logDate}>
                    <Text style={[styles.logDay, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                      {format(parseISO(log.date), 'd')}
                    </Text>
                    <Text style={[styles.logMonth, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      {format(parseISO(log.date), 'MMM')}
                    </Text>
                  </View>
                  <View style={styles.logContent}>
                    <Text style={[styles.logCount, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                      {log.count} {exerciseLabel}
                    </Text>
                    <Text style={[styles.logTime, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      {format(parseISO(log.date), 'EEEE')}
                    </Text>
                  </View>
                  <View style={styles.logActions}>
                    <Ionicons name="pencil" size={18} color={colors.textSecondary} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
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
  selectPrompt: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center' as const,
  },
  selectPromptText: {
    fontSize: 15,
    textAlign: 'center' as const,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 28,
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCard: {
    borderRadius: 20,
    padding: 12,
    paddingBottom: 8,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  calCell: {
    width: '14.28%',
    alignItems: 'center',
    marginBottom: 4,
  },
  weekdayText: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayText: {
    fontSize: 14,
  },
  calDayCount: {
    fontSize: 10,
    marginTop: 1,
  },
  calHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  emptyLog: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyLogText: {
    fontSize: 14,
    textAlign: 'center',
  },
  logList: {
    gap: 12,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  logDate: {
    alignItems: 'center',
    width: 44,
  },
  logDay: {
    fontSize: 20,
  },
  logMonth: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  logContent: {
    flex: 1,
    gap: 2,
  },
  logCount: {
    fontSize: 16,
  },
  logTime: {
    fontSize: 14,
  },
  logActions: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
