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
      const dateLabel = format(date, 'd');
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
        dateLabel,
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

  const yTicks = useMemo(() => {
    const step = Math.ceil(maxValue / 4);
    const ticks: number[] = [];
    for (let v = 0; v <= maxValue; v += step) {
      ticks.push(v);
    }
    if (ticks[ticks.length - 1] < maxValue) {
      ticks.push(maxValue);
    }
    return ticks;
  }, [maxValue]);

  const chartHeight = 110;
  const barWidth = 28;
  const yAxisWidth = 36;

  const getBarHeight = (value: number) => {
    if (value === 0) return 2;
    return Math.max(2, (value / maxValue) * chartHeight);
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
      <View style={styles.chartArea}>
        <View style={[styles.yAxis, { width: yAxisWidth, height: chartHeight }]}>
          {yTicks.slice().reverse().map((tick, i) => {
            const bottom = (tick / maxValue) * chartHeight;
            return (
              <Text
                key={i}
                style={[
                  styles.yLabel,
                  {
                    color: colors.textSecondary,
                    position: 'absolute',
                    bottom: bottom - 6,
                    right: 4,
                  },
                ]}
              >
                {tick}
              </Text>
            );
          })}
        </View>

        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onLayout={scrollToToday}
            contentContainerStyle={styles.chartScrollContent}
          >
            <View>
              <View style={[styles.gridLines, { height: chartHeight }]}>
                {yTicks.map((tick, i) => {
                  const bottom = (tick / maxValue) * chartHeight;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.gridLine,
                        {
                          bottom,
                          backgroundColor: colors.progressBackground,
                          width: dayData.length * (barWidth + 6),
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <View style={[styles.barsRow, { height: chartHeight }]}>
                {dayData.map(day => {
                  const actualHeight = getBarHeight(day.count);
                  const targetHeight = getBarHeight(day.target);
                  const isBarTapped = tappedDate === day.date;

                  return (
                    <View key={day.date} style={[styles.barCol, { width: barWidth }]}>
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
                        style={styles.barPress}
                      >
                        <View style={{ height: chartHeight, justifyContent: 'flex-end' }}>
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
                        {day.isToday && <View style={[styles.todayDot, { backgroundColor: colors.tint }]} />}
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <View style={styles.xAxis}>
                {dayData.map(day => (
                  <View key={day.date} style={[styles.xLabelWrap, { width: barWidth }]}>
                    <Text
                      style={[
                        styles.xLabel,
                        { color: day.isToday ? colors.tint : colors.textSecondary },
                        day.isToday && { fontFamily: 'Inter_700Bold' },
                      ]}
                    >
                      {day.dateLabel}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  chartArea: {
    flexDirection: 'row',
  },
  yAxis: {
    justifyContent: 'space-between',
    marginRight: 2,
  },
  yLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
  },
  chartScrollContent: {
    paddingRight: 16,
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    left: 0,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  barCol: {
    alignItems: 'center',
    gap: 2,
  },
  barPress: {
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
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  xAxis: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  xLabelWrap: {
    alignItems: 'center',
  },
  xLabel: {
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
