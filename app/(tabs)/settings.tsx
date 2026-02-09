import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Switch, Alert, useColorScheme, Platform, ActivityIndicator, PanResponder, Animated as RNAnimated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

import Colors from '@/constants/colors';
import { usePushups, Challenge } from '@/contexts/PushupContext';
import { useAuth } from '@/contexts/AuthContext';

function SwipeableChallenge({ challenge, onDelete, colors }: { challenge: Challenge; onDelete: (id: string, name: string) => void; colors: any }) {
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -100));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -60) {
          RNAnimated.spring(translateX, { toValue: -80, useNativeDriver: true }).start();
        } else {
          RNAnimated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const resetSwipe = () => {
    RNAnimated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  };

  return (
    <View style={[styles.swipeContainer, { overflow: 'hidden', borderRadius: 16 }]}>
      <Pressable
        onPress={() => {
          resetSwipe();
          onDelete(challenge.id, challenge.name);
        }}
        style={[styles.deleteBackground, { backgroundColor: colors.error }]}
      >
        <Ionicons name="trash" size={22} color="#FFFFFF" />
      </Pressable>
      <RNAnimated.View
        {...panResponder.panHandlers}
        style={[
          styles.challengeRow,
          { backgroundColor: colors.card, transform: [{ translateX }] },
        ]}
      >
        <View style={styles.challengeInfo}>
          <Text style={[styles.challengeName, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            {challenge.name}
          </Text>
          <Text style={[styles.challengeMeta, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            {challenge.exerciseType} - {challenge.totalGoal.toLocaleString()} total
          </Text>
        </View>
        <Ionicons name="chevron-back" size={16} color={colors.textSecondary} style={{ opacity: 0.4 }} />
      </RNAnimated.View>
    </View>
  );
}

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

  const { isLoading, challenges, activeChallenge, deleteChallenge } = usePushups();
  const { user, logout, deleteAccount } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const requestNotificationPermission = async () => {
    if (Platform.OS === 'web') return true;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  };

  const handleToggleNotifications = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
        return;
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    setNotificationsEnabled(value);
  };

  const handleDeleteChallenge = (challengeId: string, name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Challenge',
      `Delete "${name}"? All progress will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteChallenge(challengeId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const personalChallenges = challenges.filter(c => c.isPersonal);

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

        {activeChallenge && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
              ACTIVE CHALLENGE
            </Text>
            <SwipeableChallenge
              challenge={activeChallenge}
              onDelete={handleDeleteChallenge}
              colors={colors}
            />
            <Text style={[styles.swipeHint, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Swipe left to delete
            </Text>
          </View>
        )}

        {challenges.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
              ALL CHALLENGES
            </Text>
            {challenges.map((challenge) => (
              <SwipeableChallenge
                key={challenge.id}
                challenge={challenge}
                onDelete={handleDeleteChallenge}
                colors={colors}
              />
            ))}
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
                    Get notified to stay on track
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
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
            ACTIONS
          </Text>
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
              New Personal Challenge
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {user && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
              ACCOUNT
            </Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.goalInfo}>
                <View style={[styles.goalIcon, { backgroundColor: colors.tint + '20' }]}>
                  <Ionicons name="person" size={24} color={colors.tint} />
                </View>
                <View style={styles.goalDetails}>
                  <Text style={[styles.goalValue, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
                    {user.displayName}
                  </Text>
                  <Text style={[styles.goalDate, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    @{user.username}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable
              onPress={() => {
                Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: logout },
                ]);
              }}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.card },
                pressed && { opacity: 0.8 },
              ]}
              testID="logout-btn"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.error + '20' }]}>
                <Ionicons name="log-out" size={22} color={colors.error} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.error, fontFamily: 'Inter_600SemiBold' }]}>
                Sign Out
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Delete Account',
                  'This will permanently delete your account, all your challenges, and all your progress. This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete My Account',
                      style: 'destructive',
                      onPress: () => {
                        Alert.alert(
                          'Are you absolutely sure?',
                          'All data will be permanently removed.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Yes, Delete Everything',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await deleteAccount();
                                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                } catch {
                                  Alert.alert('Error', 'Failed to delete account. Please try again.');
                                }
                              },
                            },
                          ]
                        );
                      },
                    },
                  ]
                );
              }}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.card },
                pressed && { opacity: 0.8 },
              ]}
              testID="delete-account-btn"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.error + '20' }]}>
                <Ionicons name="person-remove" size={22} color={colors.error} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.error, fontFamily: 'Inter_600SemiBold' }]}>
                Delete Account
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            RepGather v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 24 },
  title: { fontSize: 28 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 12, letterSpacing: 1, marginLeft: 4 },
  card: { padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  goalIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  goalDetails: { gap: 2 },
  goalValue: { fontSize: 18 },
  goalDate: { fontSize: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingText: { gap: 2 },
  settingLabel: { fontSize: 16 },
  settingDescription: { fontSize: 13 },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 12 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontSize: 16 },
  challengeRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
  challengeInfo: { flex: 1, gap: 4 },
  challengeName: { fontSize: 16 },
  challengeMeta: { fontSize: 13 },
  deleteBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  swipeContainer: { position: 'relative' },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  swipeHint: { fontSize: 12, textAlign: 'center', marginTop: -4 },
  footer: { alignItems: 'center', paddingVertical: 20 },
  footerText: { fontSize: 14 },
});
