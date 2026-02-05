import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, useColorScheme, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, parseISO } from 'date-fns';

import Colors from '@/constants/colors';
import { usePushups } from '@/contexts/PushupContext';

export default function EditLogScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { date } = useLocalSearchParams<{ date: string }>();
  const { logs, updateLog, deleteLog } = usePushups();

  const existingLog = logs.find(log => log.date === date);
  const [count, setCount] = useState(existingLog?.count.toString() || '');

  useEffect(() => {
    if (existingLog) {
      setCount(existingLog.count.toString());
    }
  }, [existingLog]);

  const handleCountChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText === '' || numericText === '0') {
      setCount('');
      return;
    }
    setCount(numericText.replace(/^0+/, '') || '');
  };

  const handleSave = async () => {
    const countNum = parseInt(count, 10) || 0;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateLog(date!, countNum);
    router.back();
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this log entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLog(date!);
            router.back();
          },
        },
      ]
    );
  };

  const formattedDate = date ? format(parseISO(date), 'EEEE, MMMM d, yyyy') : '';
  const displayCount = count || '0';

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: colors.card },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
          Edit Entry
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={[styles.dateCard, { backgroundColor: colors.card }]}>
          <Ionicons name="calendar" size={24} color={colors.tint} />
          <Text style={[styles.dateText, { color: colors.text, fontFamily: 'Inter_500Medium' }]}>
            {formattedDate}
          </Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={[styles.label, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            Push-ups completed
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text, fontFamily: 'Inter_700Bold' }]}
              value={count}
              onChangeText={handleCountChange}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={5}
              autoFocus
            />
          </View>
        </View>

        <View style={styles.quickButtons}>
          {[5, 10, 25, 50].map((num) => (
            <Pressable
              key={num}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const current = parseInt(count, 10) || 0;
                setCount((current + num).toString());
              }}
              style={({ pressed }) => [
                styles.quickButton,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.quickButtonText, { color: colors.tint, fontFamily: 'Inter_600SemiBold' }]}>
                +{num}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) }]}>
        {existingLog && (
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              { backgroundColor: colors.error + '15' },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="trash" size={20} color={colors.error} />
          </Pressable>
        )}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: colors.tint, flex: existingLog ? 1 : undefined },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={[styles.saveButtonText, { fontFamily: 'Inter_600SemiBold' }]}>
            Save Changes
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 24,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  dateText: {
    fontSize: 16,
  },
  inputSection: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  input: {
    fontSize: 48,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 0,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  deleteButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
  },
  saveButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
});
