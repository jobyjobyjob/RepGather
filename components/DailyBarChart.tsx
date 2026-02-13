import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { format, parseISO, eachDayOfInterval, isToday, startOfDay, min } from 'date-fns';

interface DailyBarChartProps {
  logs: Array<{ date: string; count: number }>;
  startDate: string;
  endDate: string;
  colors: {
    tint: string;
    text: string;
    textSecondary: string;
    card: string;
    background: string;
    progressBackground: string;
  };
  exerciseLabel: string;
}

interface DayData {
  date: string;
  count: number;
  dayLabel: string;
  isToday: boolean;
}

export default function DailyBarChart({
  logs,
  startDate,
  endDate,
  colors,
  exerciseLabel,
}: DailyBarChartProps) {
  const [tappedDate, setTappedDate] = useState<string | null>(null);

  const dayData = useMemo(() => {
    const start = startOfDay(parseISO(startDate));
    const end = startOfDay(min([parseISO(endDate), new Date()]));

    const days = eachDayOfInterval({ start, end });
    const logsMap = new Map(logs.map(log => [log.date, log.count]));

    return days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayLabel = format(date, 'E').charAt(0);
      const count = logsMap.get(dateStr) || 0;
      return {
        date: dateStr,
        count,
        dayLabel,
        isToday: isToday(date),
      };
    });
  }, [startDate, endDate, logs]);

  const displayDays = useMemo(() => {
    if (dayData.length <= 14) {
      return dayData;
    }
    return dayData.slice(-14);
  }, [dayData]);

  const maxCount = useMemo(() => {
    const counts = displayDays.map(d => d.count);
    return Math.max(...counts, 1);
  }, [displayDays]);

  const maxBarHeight = 100;
  const minBarHeight = 2;

  const getBarHeight = (count: number) => {
    if (count === 0) return minBarHeight;
    return Math.max(minBarHeight, (count / maxCount) * maxBarHeight);
  };

  if (displayDays.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>Daily Activity</Text>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No activity yet. Start logging your {exerciseLabel}!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>Daily Activity</Text>
      <View style={styles.chartContainer}>
        {displayDays.map(day => {
          const barHeight = getBarHeight(day.count);
          const isBarTapped = tappedDate === day.date;
          const barColor = day.count === 0 ? colors.progressBackground : colors.tint;

          return (
            <View key={day.date} style={styles.barWrapper}>
              {isBarTapped && (
                <Text style={[styles.countLabel, { color: colors.text }]}>
                  {day.count}
                </Text>
              )}
              <Pressable
                onPress={() => {
                  setTappedDate(isBarTapped ? null : day.date);
                  if (!isBarTapped) {
                    const timer = setTimeout(() => {
                      setTappedDate(null);
                    }, 2000);
                    return () => clearTimeout(timer);
                  }
                }}
                style={({ pressed }) => [
                  styles.barPressable,
                  { height: barHeight, backgroundColor: barColor },
                  pressed && { opacity: 0.8 },
                ]}
              >
                {day.isToday && <View style={styles.todayIndicator} />}
              </Pressable>
              <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
                {day.dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 20,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    gap: 8,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barPressable: {
    width: '100%',
    borderRadius: 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    minHeight: 2,
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  countLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
