import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Switch, Alert, useColorScheme, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

import Colors from '@/constants/colors';
import { usePushups } from '@/contexts/PushupContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { isLoading, goal, reminderSettings, updateReminders, resetChallenge, progress } = usePushups();
  const [notificationsEnabled, setNotificationsEnabled] = useState(reminderSettings.enabled);

  useEffect(() => {
    setNotificationsEnabled(reminderSettings.enabled);
  }, [reminderSettings.enabled]);

  const requestNotificationPermission = async () => {
    if (Platform.OS === 'web') {
      return true;
    }
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  };

  const scheduleReminders = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    for (const time of reminderSettings.times) {
      const [hours, minutes] = time.split(':').map(Number);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time for Push-ups!',
          body: `You have ${progress?.dynamicDailyTarget || 0} push-ups to do today. Let's go!`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive reminders.',
          [{ text: 'OK' }]
        );
        return;
      }
      await scheduleReminders();
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    
    setNotificationsEnabled(value);
    await updateReminders({ ...reminderSettings, enabled: value });
  };

  const handleResetChallenge = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Reset Challenge',
      'This will delete all your progress and start fresh. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetChallenge();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleEditGoal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/setup');
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

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
          Settings
        </Text>

        {goal && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
              CURRENT GOAL
            </Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.goalInfo}>
                <View style={[styles.goalIcon, { backgroundColor: colors.tint + '20' }]}>
                  <Ionicons name="flag" size={24} color={colors.tint} />
                </View>
                <View style={styles.goalDetails}>
                  <Text style={[styles.goalValue, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
                    {goal.totalGoal.toLocaleString()} push-ups
                  </Text>
                  <Text style={[styles.goalDate, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    by {new Date(goal.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={handleEditGoal}
                style={({ pressed }) => [
                  styles.editButton,
                  { backgroundColor: colors.tint },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
            REMINDERS
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications" size={22} color={colors.tint} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                    Daily Reminders
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    Get notified to do your push-ups
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.progressBackground, true: colors.tint + '80' }}
                thumbColor={notificationsEnabled ? colors.tint : colors.textSecondary}
              />
            </View>
          </View>
          {notificationsEnabled && (
            <View style={[styles.reminderTimes, { backgroundColor: colors.card }]}>
              <Text style={[styles.reminderTitle, { color: colors.text, fontFamily: 'Inter_500Medium' }]}>
                Reminder times:
              </Text>
              <View style={styles.timesList}>
                {reminderSettings.times.map((time, index) => (
                  <View key={index} style={[styles.timeChip, { backgroundColor: colors.tint + '20' }]}>
                    <Ionicons name="time" size={14} color={colors.tint} />
                    <Text style={[styles.timeText, { color: colors.tint, fontFamily: 'Inter_500Medium' }]}>
                      {formatTime(time)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
            ACTIONS
          </Text>
          {!goal && (
            <Pressable
              onPress={() => router.push('/setup')}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.card },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.tint + '20' }]}>
                <Ionicons name="add-circle" size={22} color={colors.tint} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
                Start New Challenge
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
          {goal && (
            <Pressable
              onPress={handleResetChallenge}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.card },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.error + '20' }]}>
                <Ionicons name="refresh" size={22} color={colors.error} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.error, fontFamily: 'Inter_600SemiBold' }]}>
                Reset Challenge
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            PushUp Pro v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
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
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 1,
    marginLeft: 4,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalDetails: {
    gap: 2,
  },
  goalValue: {
    fontSize: 18,
  },
  goalDate: {
    fontSize: 14,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    gap: 2,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingDescription: {
    fontSize: 13,
  },
  reminderTimes: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  reminderTitle: {
    fontSize: 14,
  },
  timesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timeText: {
    fontSize: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
  },
});
