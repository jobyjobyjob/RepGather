import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { format, parseISO, startOfMonth, getDay, getDaysInMonth, isSameDay, isAfter, isBefore, startOfDay } from 'date-fns';
import { DailyLog, PushupGoal } from '@/lib/types';
import { calculatePlanTarget } from '@/lib/storage';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface MonthCalendarProps {
  goal: PushupGoal;
  logs: DailyLog[];
  colors: {
    text: string;
    textSecondary: string;
    card: string;
    tint: string;
    success: string;
    border: string;
    progressBackground: string;
    background: string;
  };
}

export function MonthCalendar({ goal, logs, colors }: MonthCalendarProps) {
  const startDate = parseISO(goal.startDate);
  const endDate = parseISO(goal.endDate);
  const today = startOfDay(new Date());

  const monthStart = startOfMonth(startDate);
  const firstDayOfWeek = getDay(monthStart);
  const totalDaysInMonth = getDaysInMonth(monthStart);
  const monthLabel = format(startDate, 'MMMM yyyy');

  const logMap = useMemo(() => {
    const map: Record<string, number> = {};
    logs.forEach(log => {
      map[log.date] = log.count;
    });
    return map;
  }, [logs]);

  const calendarDays = useMemo(() => {
    const days: { day: number | null; dateStr: string; isInRange: boolean; isPast: boolean; isToday: boolean; value: number | null }[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: null, dateStr: '', isInRange: false, isPast: false, isToday: false, value: null });
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth(), d);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayStart = startOfDay(date);
      const isInRange = !isBefore(dayStart, startOfDay(startDate)) && !isAfter(dayStart, startOfDay(endDate));
      const isToday = isSameDay(dayStart, today);
      const isPast = isBefore(dayStart, today) || isToday;

      let value: number | null = null;
      if (isInRange) {
        if (isPast) {
          value = logMap[dateStr] ?? 0;
        } else {
          value = calculatePlanTarget(goal, dateStr);
        }
      }

      days.push({ day: d, dateStr, isInRange, isPast, isToday, value });
    }

    return days;
  }, [startDate, endDate, today, totalDaysInMonth, firstDayOfWeek, logMap, goal]);

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.monthTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
        {monthLabel}
      </Text>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((wd) => (
          <View key={wd} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              {wd}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((item, idx) => {
          if (item.day === null) {
            return <View key={`empty-${idx}`} style={styles.dayCell} />;
          }

          const hasCompleted = item.isPast && item.isInRange && (logMap[item.dateStr] ?? 0) > 0;
          const isFutureInRange = item.isInRange && !item.isPast;

          return (
            <View key={item.dateStr} style={styles.dayCell}>
              <View
                style={[
                  styles.dayCellInner,
                  item.isToday && { borderWidth: 2, borderColor: colors.tint },
                  !item.isInRange && { opacity: 0.25 },
                  hasCompleted && { backgroundColor: colors.success + '20' },
                  isFutureInRange && { backgroundColor: colors.tint + '10' },
                ]}
              >
                <Text style={[
                  styles.dayNumber,
                  { color: item.isToday ? colors.tint : colors.text, fontFamily: item.isToday ? 'Inter_700Bold' : 'Inter_500Medium' },
                ]}>
                  {item.day}
                </Text>
                {item.isInRange && item.value !== null && (
                  <Text style={[
                    styles.dayValue,
                    {
                      color: hasCompleted ? colors.success : isFutureInRange ? colors.tint : colors.textSecondary,
                      fontFamily: 'Inter_600SemiBold',
                    },
                  ]}>
                    {item.value}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success + '50' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Completed
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.tint + '30' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Plan target
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  monthTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 0.85,
    padding: 2,
  },
  dayCellInner: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dayNumber: {
    fontSize: 13,
  },
  dayValue: {
    fontSize: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
  },
});
