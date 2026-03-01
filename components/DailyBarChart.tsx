import React, { useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { format, parseISO, eachDayOfInterval, isToday as isDateToday, isAfter, startOfDay } from 'date-fns';

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
  futureTargets?: Map<string, number>;
  dynamicDailyTarget?: number;
}

interface DayData {
  date: string;
  count: number;
  target: number;
  dayLabel: string;
  isToday: boolean;
  isFuture: boolean;
}

export default function DailyBarChart({
  logs,
  startDate,
  endDate,
  colors,
  exerciseLabel,
  futureTargets,
  dynamicDailyTarget,
}: DailyBarChartProps) {
  const [tappedDate, setTappedDate] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const dayData = useMemo(() => {
    const start = startOfDay(parseISO(startDate));
    const end = startOfDay(parseISO(endDate));
    const today = startOfDay(new Date());

    const days = eachDayOfInterval({ start, end });
    const logsMap = new Map(logs.map(log => [log.date, log.count]));

    return days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayLabel = format(date, 'E').charAt(0);
      const count = logsMap.get(dateStr) || 0;
      const isFuture = isAfter(date, today);
      const todayFlag = isDateToday(date);

      let target = 0;
      if (todayFlag && dynamicDailyTarget) {
        target = dynamicDailyTarget;
      } else if (isFuture && futureTargets) {
        target = futureTargets.get(dateStr) || 0;
      }

      return {
        date: dateStr,
        count,
        target,
        dayLabel,
        isToday: todayFlag,
        isFuture,
      };
    });
  }, [startDate, endDate, logs, futureTargets, dynamicDailyTarget]);

  const maxValue = useMemo(() => {
    let m = 1;
    for (const d of dayData) {
      if (d.count > m) m = d.count;
      if (d.target > m) m = d.target;
    }
    return m;
  }, [dayData]);

  const maxBarHeight = 100;
  const minBarHeight = 2;
  const barWidth = 28;

  const getBarHeight = (value: number) => {
    if (value === 0) return minBarHeight;
    return Math.max(minBarHeight, (value / maxValue) * maxBarHeight);
  };

  const todayIndex = dayData.findIndex(d => d.isToday);

  if (dayData.length === 0) {
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

  const scrollToToday = () => {
    if (todayIndex >= 0 && scrollViewRef.current) {
      const offset = Math.max(0, todayIndex * (barWidth + 6) - 120);
      scrollViewRef.current.scrollTo({ x: offset, animated: false });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>Daily Activity</Text>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={scrollToToday}
        contentContainerStyle={styles.chartScrollContent}
      >
        <View style={styles.chartContainer}>
          {dayData.map(day => {
            const actualHeight = getBarHeight(day.count);
            const targetHeight = getBarHeight(day.target);
            const isBarTapped = tappedDate === day.date;

            return (
              <View key={day.date} style={[styles.barWrapper, { width: barWidth }]}>
                {isBarTapped && (
                  <Text style={[styles.countLabel, { color: colors.text }]}>
                    {day.count}{day.target > 0 ? `/${day.target}` : ''}
                  </Text>
                )}
                <Pressable
                  onPress={() => {
                    setTappedDate(isBarTapped ? null : day.date);
                    if (!isBarTapped) {
                      setTimeout(() => setTappedDate(null), 2500);
                    }
                  }}
                  style={styles.barArea}
                >
                  <View style={{ height: maxBarHeight, justifyContent: 'flex-end' }}>
                    {day.target > 0 && (
                      <View
                        style={[
                          styles.targetBar,
                          {
                            height: targetHeight,
                            borderColor: colors.textSecondary,
                          },
                        ]}
                      />
                    )}
                    <View
                      style={[
                        styles.actualBar,
                        {
                          height: actualHeight,
                          backgroundColor: day.count === 0
                            ? (day.isFuture ? 'transparent' : colors.progressBackground)
                            : colors.tint,
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                        },
                      ]}
                    />
                  </View>
                  {day.isToday && <View style={[styles.todayIndicator, { backgroundColor: colors.tint }]} />}
                </Pressable>
                <Text style={[
                  styles.dayLabel,
                  { color: day.isToday ? colors.tint : colors.textSecondary },
                  day.isToday && { fontFamily: 'Inter_700Bold' },
                ]}>
                  {day.dayLabel}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  chartScrollContent: {
    paddingRight: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 6,
  },
  barWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  barArea: {
    width: '100%',
    alignItems: 'center',
  },
  targetBar: {
    width: '100%',
    borderRadius: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  actualBar: {
    borderRadius: 4,
    minHeight: 2,
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  countLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
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
