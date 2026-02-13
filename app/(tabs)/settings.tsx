import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Switch, Alert, useColorScheme, Platform, ActivityIndicator, PanResponder, Animated as RNAnimated, TextInput, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

import Colors from '@/constants/colors';
import { usePushups, Challenge } from '@/contexts/PushupContext';
import { useAuth } from '@/contexts/AuthContext';
import { AGE_RANGES, GENDER_OPTIONS } from '@shared/schema';

function SwipeableChallenge({ challenge, onDelete, colors, isActive, onActivate }: {
  challenge: Challenge;
  onDelete: (id: string, name: string) => void;
  colors: any;
  isActive: boolean;
  onActivate: (id: string) => void;
}) {
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const deleteOpacity = useRef(new RNAnimated.Value(0)).current;
  const isOpen = useRef(false);

  const closeRow = () => {
    isOpen.current = false;
    RNAnimated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    RNAnimated.timing(deleteOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
  };

  const openRow = () => {
    isOpen.current = true;
    RNAnimated.timing(translateX, { toValue: -80, duration: 200, useNativeDriver: true }).start();
    RNAnimated.timing(deleteOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
      },
      onPanResponderMove: (_, gestureState) => {
        const base = isOpen.current ? -80 : 0;
        const newX = base + gestureState.dx;
        const clamped = Math.max(Math.min(newX, 0), -100);
        translateX.setValue(clamped);
        deleteOpacity.setValue(Math.min(1, Math.abs(clamped) / 40));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isOpen.current) {
          if (gestureState.dx > 30) {
            closeRow();
          } else {
            openRow();
          }
        } else {
          if (gestureState.dx < -50) {
            openRow();
          } else {
            closeRow();
          }
        }
      },
      onPanResponderTerminate: () => {
        closeRow();
      },
    })
  ).current;

  return (
    <View style={[styles.swipeContainer, { borderRadius: 14, overflow: 'hidden' }]}>
      <RNAnimated.View
        style={[
          styles.deleteBackground,
          { backgroundColor: colors.error, opacity: deleteOpacity },
        ]}
        pointerEvents={isOpen.current ? 'auto' : 'none'}
      >
        <Pressable
          onPress={() => {
            closeRow();
            onDelete(challenge.id, challenge.name);
          }}
          style={styles.deleteBackgroundInner}
        >
          <Ionicons name="trash" size={22} color="#FFFFFF" />
        </Pressable>
      </RNAnimated.View>
      <RNAnimated.View
        {...panResponder.panHandlers}
        style={[
          styles.challengeRow,
          {
            backgroundColor: isActive ? colors.tint + '10' : colors.card,
            borderColor: isActive ? colors.tint + '30' : 'transparent',
            borderWidth: isActive ? 1 : 0,
            transform: [{ translateX }],
          },
        ]}
      >
        <Pressable
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={() => {
            if (isOpen.current) {
              closeRow();
            } else {
              onActivate(challenge.id);
            }
          }}
        >
          <View style={[styles.challengeIcon, { backgroundColor: isActive ? colors.tint + '25' : colors.progressBackground }]}>
            <Ionicons
              name={challenge.isPersonal ? "person" : "people"}
              size={16}
              color={isActive ? colors.tint : colors.textSecondary}
            />
          </View>
          <View style={styles.challengeInfo}>
            <Text style={[styles.challengeName, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
              {challenge.name}
            </Text>
            <Text style={[styles.challengeMeta, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {challenge.exerciseType} · {challenge.totalGoal.toLocaleString()} total
            </Text>
          </View>
          {isActive && (
            <View style={[styles.activeBadge, { backgroundColor: colors.tint + '20' }]}>
              <Ionicons name="radio-button-on" size={10} color={colors.tint} />
              <Text style={[styles.activeBadgeText, { color: colors.tint }]}>Active</Text>
            </View>
          )}
          <Ionicons name="chevron-back" size={14} color={colors.textSecondary} style={{ opacity: 0.3 }} />
        </Pressable>
      </RNAnimated.View>
    </View>
  );
}

function PickerModal({ visible, onClose, options, selectedValue, onSelect, title, colors }: {
  visible: boolean;
  onClose: () => void;
  options: readonly string[];
  selectedValue: string;
  onSelect: (v: string) => void;
  title: string;
  colors: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => { onSelect(opt); onClose(); }}
              style={[styles.modalOption, selectedValue === opt && { backgroundColor: colors.tint + '15' }]}
            >
              <Text style={[styles.modalOptionText, { color: selectedValue === opt ? colors.tint : colors.text }]}>{opt}</Text>
              {selectedValue === opt && <Ionicons name="checkmark" size={20} color={colors.tint} />}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
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

  const { isLoading, challenges, activeChallengeId, setActiveChallenge, deleteChallenge } = usePushups();
  const { user, logout, deleteAccount, updateProfile } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [showProfile, setShowProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAgeRange, setEditAgeRange] = useState('');
  const [editGender, setEditGender] = useState('');
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const openProfile = () => {
    setEditDisplayName(user?.displayName || '');
    setEditAgeRange(user?.ageRange || '');
    setEditGender(user?.gender || '');
    setShowProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }
    setProfileSaving(true);
    try {
      await updateProfile({
        displayName: editDisplayName.trim(),
        ageRange: editAgeRange,
        gender: editGender,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowProfile(false);
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

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

  const handleActivate = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveChallenge(id);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const groupChallenges = challenges.filter(c => !c.isPersonal);
  const personalChallenges = challenges.filter(c => c.isPersonal);

  const renderProfileSection = () => {
    if (showProfile) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
              EDIT PROFILE
            </Text>
            <Pressable onPress={() => setShowProfile(false)}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.profileEditCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Display Name</Text>
            <View style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.fieldInputText, { color: colors.text }]}
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                placeholder="Your name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Age Range</Text>
            <Pressable
              onPress={() => setShowAgePicker(true)}
              style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, justifyContent: 'center' }]}
            >
              <Text style={[styles.fieldInputText, { color: editAgeRange ? colors.text : colors.textSecondary }]}>
                {editAgeRange || 'Select age range'}
              </Text>
            </Pressable>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Gender</Text>
            <Pressable
              onPress={() => setShowGenderPicker(true)}
              style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, justifyContent: 'center' }]}
            >
              <Text style={[styles.fieldInputText, { color: editGender ? colors.text : colors.textSecondary }]}>
                {editGender || 'Select gender'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSaveProfile}
              disabled={profileSaving}
              style={({ pressed }) => [
                styles.saveProfileBtn,
                { backgroundColor: colors.tint },
                pressed && { opacity: 0.9 },
              ]}
            >
              {profileSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveProfileBtnText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
          PROFILE
        </Text>
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.tint + '20' }]}>
              <Text style={[styles.avatarText, { color: colors.tint }]}>
                {(user?.displayName || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {user?.displayName}
              </Text>
              <Text style={[styles.profileUsername, { color: colors.textSecondary }]}>
                @{user?.username}
              </Text>
            </View>
            <Pressable
              onPress={openProfile}
              style={[styles.editBtn, { backgroundColor: colors.tint + '15' }]}
            >
              <Ionicons name="create-outline" size={18} color={colors.tint} />
            </Pressable>
          </View>
          <View style={[styles.profileDivider, { backgroundColor: colors.border }]} />
          <View style={styles.profileDetails}>
            <View style={styles.profileDetailRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.profileDetailLabel, { color: colors.textSecondary }]}>Age</Text>
              <Text style={[styles.profileDetailValue, { color: colors.text }]}>
                {user?.ageRange || 'Not set'}
              </Text>
            </View>
            <View style={styles.profileDetailRow}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.profileDetailLabel, { color: colors.textSecondary }]}>Gender</Text>
              <Text style={[styles.profileDetailValue, { color: colors.text }]}>
                {user?.gender || 'Not set'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

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
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
          Settings
        </Text>

        {user && renderProfileSection()}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
              CHALLENGES ({challenges.length})
            </Text>
            <Pressable
              onPress={() => router.push('/setup')}
              style={[styles.addChipBtn, { backgroundColor: colors.tint + '15' }]}
            >
              <Ionicons name="add" size={16} color={colors.tint} />
              <Text style={[styles.addChipText, { color: colors.tint }]}>New</Text>
            </Pressable>
          </View>

          {challenges.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="fitness-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No challenges yet. Create one to get started!
              </Text>
            </View>
          ) : (
            <>
              {groupChallenges.length > 0 && (
                <>
                  <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>
                    Group Challenges
                  </Text>
                  {groupChallenges.map((challenge) => (
                    <SwipeableChallenge
                      key={challenge.id}
                      challenge={challenge}
                      onDelete={handleDeleteChallenge}
                      colors={colors}
                      isActive={activeChallengeId === challenge.id}
                      onActivate={handleActivate}
                    />
                  ))}
                </>
              )}
              {personalChallenges.length > 0 && (
                <>
                  <Text style={[styles.subSectionTitle, { color: colors.textSecondary, marginTop: groupChallenges.length > 0 ? 12 : 0 }]}>
                    Personal Challenges
                  </Text>
                  {personalChallenges.map((challenge) => (
                    <SwipeableChallenge
                      key={challenge.id}
                      challenge={challenge}
                      onDelete={handleDeleteChallenge}
                      colors={colors}
                      isActive={activeChallengeId === challenge.id}
                      onActivate={handleActivate}
                    />
                  ))}
                </>
              )}
              <Text style={[styles.swipeHint, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Tap to activate · Swipe left to delete
              </Text>
            </>
          )}
        </View>

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
            ACCOUNT
          </Text>
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

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            RepGather v1.0.0
          </Text>
        </View>
      </ScrollView>

      <PickerModal
        visible={showAgePicker}
        onClose={() => setShowAgePicker(false)}
        options={AGE_RANGES}
        selectedValue={editAgeRange}
        onSelect={setEditAgeRange}
        title="Age Range"
        colors={colors}
      />
      <PickerModal
        visible={showGenderPicker}
        onClose={() => setShowGenderPicker(false)}
        options={GENDER_OPTIONS}
        selectedValue={editGender}
        onSelect={setEditGender}
        title="Gender"
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 24 },
  title: { fontSize: 28 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 12, letterSpacing: 1, marginLeft: 4 },
  subSectionTitle: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.3, marginLeft: 4, marginBottom: -2 },
  card: { padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileCard: { borderRadius: 16, overflow: 'hidden' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  profileName: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  profileUsername: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  profileDivider: { height: 1, marginHorizontal: 16 },
  profileDetails: { padding: 16, gap: 12 },
  profileDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileDetailLabel: { fontSize: 14, fontFamily: 'Inter_400Regular', width: 60 },
  profileDetailValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  profileEditCard: { borderRadius: 16, padding: 16, gap: 12 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, marginBottom: -4 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 46 },
  fieldInputText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  saveProfileBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveProfileBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  addChipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  addChipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  emptyCard: { borderRadius: 16, padding: 24, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingText: { gap: 2 },
  settingLabel: { fontSize: 16 },
  settingDescription: { fontSize: 13 },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 12 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontSize: 16 },
  challengeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14 },
  challengeIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  challengeInfo: { flex: 1, gap: 2 },
  challengeName: { fontSize: 15 },
  challengeMeta: { fontSize: 12 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 6 },
  activeBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  swipeContainer: { position: 'relative', marginBottom: 6 },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  deleteBackgroundInner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeHint: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  footer: { alignItems: 'center', paddingVertical: 20 },
  footerText: { fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalContent: { borderRadius: 20, padding: 20, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 12, textAlign: 'center' },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10,
  },
  modalOptionText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
});
