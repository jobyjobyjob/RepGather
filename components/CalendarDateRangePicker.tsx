import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, useColorScheme, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  format,
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
  startOfDay,
} from 'date-fns';
import Colors from '@/constants/colors';

interface CalendarDateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onSelectStart: (date: Date) => void;
  onSelectEnd: (date: Date) => void;
  minDate?: Date;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarDateRangePicker({
  startDate,
  endDate,
  onSelectStart,
  onSelectEnd,
  minDate,
}: CalendarDateRangePickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [currentMonth, setCurrentMonth] = useState(startDate || new Date());
  const [selectingEnd, setSelectingEnd] = useState(false);

  const today = startOfDay(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDayPress = (day: Date) => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!selectingEnd || !startDate) {
      onSelectStart(day);
      setSelectingEnd(true);
    } else {
      if (isBefore(day, startDate)) {
        onSelectStart(day);
        onSelectEnd(startDate);
      } else {
        onSelectEnd(day);
      }
      setSelectingEnd(false);
    }
  };

  const isInRange = (day: Date) => {
    if (!startDate || !endDate) return false;
    return isAfter(day, startDate) && isBefore(day, endDate);
  };

  const isRangeStart = (day: Date) => startDate && isSameDay(day, startDate);
  const isRangeEnd = (day: Date) => endDate && isSameDay(day, endDate);

  const canGoPrev = true;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Pressable
          onPress={handlePrevMonth}
          style={[styles.navButton, !canGoPrev && { opacity: 0.3 }]}
          disabled={!canGoPrev}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.monthTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <Pressable onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((day, index) => {
          const inCurrentMonth = isSameMonth(day, currentMonth);
          const disabled = false;
          const isStart = isRangeStart(day);
          const isEnd = isRangeEnd(day);
          const inRange = isInRange(day);
          const isToday = isSameDay(day, today);

          return (
            <Pressable
              key={index}
              onPress={() => !disabled && inCurrentMonth && handleDayPress(day)}
              style={[
                styles.dayCell,
                inRange && { backgroundColor: colors.tint + '20' },
                isStart && { backgroundColor: colors.tint, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
                isEnd && { backgroundColor: colors.tint, borderTopRightRadius: 20, borderBottomRightRadius: 20 },
                (isStart && isEnd) && { borderRadius: 20 },
                isStart && endDate && !isSameDay(startDate!, endDate!) && { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
                isEnd && startDate && !isSameDay(startDate!, endDate!) && { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
              ]}
            >
              <View style={[
                styles.dayInner,
                isToday && !isStart && !isEnd && { borderWidth: 1.5, borderColor: colors.tint, borderRadius: 18 },
              ]}>
                <Text
                  style={[
                    styles.dayText,
                    { fontFamily: 'Inter_500Medium' },
                    inCurrentMonth
                      ? { color: colors.text }
                      : { color: colors.textSecondary, opacity: 0.3 },
                    disabled && inCurrentMonth && { color: colors.textSecondary, opacity: 0.3 },
                    (isStart || isEnd) && { color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
                    inRange && { color: colors.tint },
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.selectionHint, { backgroundColor: colors.background }]}>
        {!startDate ? (
          <Text style={[styles.hintText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Tap to select start date
          </Text>
        ) : !endDate || selectingEnd ? (
          <View style={styles.hintRow}>
            <View style={[styles.hintDot, { backgroundColor: colors.tint }]} />
            <Text style={[styles.hintText, { color: colors.text, fontFamily: 'Inter_500Medium' }]}>
              {format(startDate, 'MMM d, yyyy')}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
            <Text style={[styles.hintText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Tap end date
            </Text>
          </View>
        ) : (
          <View style={styles.hintRow}>
            <View style={[styles.hintDot, { backgroundColor: colors.tint }]} />
            <Text style={[styles.hintText, { color: colors.text, fontFamily: 'Inter_500Medium' }]}>
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </Text>
            <Text style={[styles.hintText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              ({Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} days)
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 17,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 15,
  },
  selectionHint: {
    marginHorizontal: 8,
    marginBottom: 8,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hintText: {
    fontSize: 14,
  },
});
