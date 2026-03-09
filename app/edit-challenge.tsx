import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, useColorScheme, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

import Colors from '@/constants/colors';
import { usePushups } from '@/contexts/PushupContext';
import { EXERCISE_TYPES } from '@shared/schema';

export default function EditChallengeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { challenges, updateChallenge, deleteChallenge, completeChallenge, refresh } = usePushups();

  const challenge = challenges.find(c => c.id === id);

  const [name, setName] = useState(challenge?.name || '');
  const [totalGoal, setTotalGoal] = useState(String(challenge?.totalGoal || ''));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (challenge) {
      setName(challenge.name);
      setTotalGoal(String(challenge.totalGoal));
    }
  }, [challenge?.id]);

  if (!challenge) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>Challenge Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
    );
  }

  const exerciseType = EXERCISE_TYPES.find(e => e.value === challenge.exerciseType);
  const isCompleted = challenge.status === 'completed';
  const isArchived = challenge.status === 'archived';
  const isActive = challenge.status === 'active';
  const hasChanges = name !== challenge.name || totalGoal !== String(challenge.totalGoal);

  const handleSave = async () => {
    if (!hasChanges) return;
    const goalNum = parseInt(totalGoal, 10);
    if (!name.trim()) {
      Alert.alert('Invalid Name', 'Please enter a challenge name.');
      return;
    }
    if (isNaN(goalNum) || goalNum < 1) {
      Alert.alert('Invalid Goal', 'Please enter a valid goal number.');
      return;
    }
    setSaving(true);
    try {
      await updateChallenge(challenge.id, {
        name: name.trim(),
        totalGoal: goalNum,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to update challenge.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = () => {
    Alert.alert(
      'Archive Challenge',
      'This will move the challenge to your archived list. You can still view its history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            await updateChallenge(challenge.id, { status: 'archived' });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ]
    );
  };

  const handleReactivate = () => {
    Alert.alert(
      'Reactivate Challenge',
      'This will move the challenge back to your active challenges.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            await updateChallenge(challenge.id, { status: 'active', hasSeenCompletionModal: false });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Challenge',
      'This will permanently delete the challenge and all its data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteChallenge(challenge.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]
    );
  };

  const statusLabel = isCompleted ? 'Completed' : isArchived ? 'Archived' : 'Active';
  const statusColor = isCompleted ? '#4CAF50' : isArchived ? '#9E9E9E' : colors.tint;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>Edit Challenge</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor, fontFamily: 'Inter_600SemiBold' }]}>{statusLabel}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
          <Ionicons name={exerciseType?.icon as any || 'fitness'} size={20} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            {exerciseType?.label || challenge.exerciseType}
          </Text>
        </View>

        <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            {format(new Date(challenge.startDate + 'T00:00:00'), 'MMM d, yyyy')} – {format(new Date(challenge.endDate + 'T00:00:00'), 'MMM d, yyyy')}
          </Text>
        </View>

        <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
          <Ionicons name={challenge.isPersonal ? 'person' : 'people'} size={20} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            {challenge.isPersonal ? 'Personal Challenge' : 'Group Challenge'}
          </Text>
        </View>

        {challenge.targetStyle && (
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="trending-up" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              {challenge.targetStyle === 'even' ? 'Even Split' :
               challenge.targetStyle === 'ascent' ? 'The Ascent' :
               challenge.targetStyle === 'weekday_warrior' ? 'Weekday Warrior' :
               challenge.targetStyle === 'weekender' ? 'Weekender' : challenge.targetStyle}
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>Challenge Name</Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: colors.card, 
            color: colors.text, 
            borderColor: colors.border,
            fontFamily: 'Inter_500Medium',
            opacity: isActive ? 1 : 0.6,
          }]}
          value={name}
          onChangeText={setName}
          placeholder="Challenge name"
          placeholderTextColor={colors.textSecondary}
          editable={isActive}
        />

        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>Total Goal</Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: colors.card, 
            color: colors.text, 
            borderColor: colors.border,
            fontFamily: 'Inter_500Medium',
            opacity: isActive ? 1 : 0.6,
          }]}
          value={totalGoal}
          onChangeText={setTotalGoal}
          placeholder="Total goal"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          editable={isActive}
        />

        {isActive && hasChanges && (
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, { backgroundColor: colors.tint, opacity: saving ? 0.6 : 1 }]}
          >
            <Text style={[styles.saveButtonText, { fontFamily: 'Inter_700Bold' }]}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>
        )}

        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>Actions</Text>

          {isActive && (
            <Pressable
              onPress={handleArchive}
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="archive-outline" size={20} color="#FF9800" />
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>Archive Challenge</Text>
                <Text style={[styles.actionDescription, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  Stop tracking but keep your history
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          )}

          {(isCompleted || isArchived) && (
            <Pressable
              onPress={handleReactivate}
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="refresh-outline" size={20} color="#4CAF50" />
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>Reactivate Challenge</Text>
                <Text style={[styles.actionDescription, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  Move back to active challenges
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          )}

          <Pressable
            onPress={handleDelete}
            style={[styles.actionButton, { backgroundColor: colors.card, borderColor: '#FF5252' + '30' }]}
          >
            <Ionicons name="trash-outline" size={20} color="#FF5252" />
            <View style={styles.actionTextContainer}>
              <Text style={[styles.actionTitle, { color: '#FF5252', fontFamily: 'Inter_600SemiBold' }]}>Delete Challenge</Text>
              <Text style={[styles.actionDescription, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Permanently delete this challenge and all data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  actionsSection: {
    marginTop: 8,
    gap: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    gap: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
  },
  actionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
});
