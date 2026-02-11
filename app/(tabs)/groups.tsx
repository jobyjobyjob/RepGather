import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  ActivityIndicator, useColorScheme, Platform, Alert, ScrollView, RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, parseISO, differenceInDays, differenceInCalendarDays } from 'date-fns';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { usePushups } from '@/contexts/PushupContext';
import { apiRequest, queryClient } from '@/lib/query-client';
import { EXERCISE_TYPES } from '@shared/schema';
import CalendarDateRangePicker from '@/components/CalendarDateRangePicker';

type ViewMode = 'list' | 'create' | 'join' | 'detail';

interface GroupData {
  id: string;
  name: string;
  inviteCode: string;
  exerciseType: string;
  goalType: string;
  totalGoal: number;
  startDate: string;
  endDate: string;
  createdBy: string;
  isPersonal: boolean;
  myIndividualGoal?: number | null;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalCount: number;
  individualGoal: number | null;
  groupGoal: number;
  exerciseType: string;
  goalType: string;
}

interface MemberData {
  id: string;
  username: string;
  displayName: string;
  individualGoal: number | null;
}

export default function GroupsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeChallengeId, setActiveChallenge: setActiveGroupCtx, refresh } = usePushups();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);

  const [groupName, setGroupName] = useState('');
  const [groupGoal, setGroupGoal] = useState('');
  const [exerciseType, setExerciseType] = useState('Push-ups');
  const [customExercise, setCustomExercise] = useState('');
  const [goalType, setGoalType] = useState<'group' | 'individual'>('group');
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [individualGoalInput, setIndividualGoalInput] = useState('');
  const [showSetGoal, setShowSetGoal] = useState(false);

  const [calStartDate, setCalStartDate] = useState<Date | null>(null);
  const [calEndDate, setCalEndDate] = useState<Date | null>(null);

  const groupsQuery = useQuery<GroupData[]>({
    queryKey: ['/api/groups'],
  });

  const leaderboardQuery = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/groups', selectedGroup?.id, 'leaderboard'],
    enabled: !!selectedGroup,
  });

  const membersQuery = useQuery<MemberData[]>({
    queryKey: ['/api/groups', selectedGroup?.id, 'members'],
    enabled: !!selectedGroup,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; exerciseType: string; goalType: string; totalGoal: number; startDate: string; endDate: string }) => {
      const res = await apiRequest("POST", "/api/groups", data);
      return res.json();
    },
    onSuccess: async (group: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setViewMode('list');
      setGroupName('');
      setGroupGoal('');
      setExerciseType('Push-ups');
      setGoalType('group');
      setCreateError('');
      await refresh();
      if (group?.id) {
        await setActiveGroupCtx(group.id);
      }
    },
    onError: (err: any) => {
      setCreateError(err.message || 'Failed to create group');
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/groups/join", { inviteCode: code });
      return res.json();
    },
    onSuccess: async (group: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setViewMode('list');
      setInviteCode('');
      setJoinError('');
      await refresh();
      if (group?.id) {
        await setActiveGroupCtx(group.id);
      }
    },
    onError: (err: any) => {
      const msg = err.message || 'Failed to join group';
      try {
        const parsed = JSON.parse(msg.replace(/^\d+:\s*/, ''));
        setJoinError(parsed.message || msg);
      } catch {
        setJoinError(msg.replace(/^\d+:\s*/, ''));
      }
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await apiRequest("DELETE", `/api/groups/${groupId}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      refresh();
      setViewMode('list');
      setSelectedGroup(null);
    },
  });

  const setIndividualGoalMutation = useMutation({
    mutationFn: async ({ groupId, goal }: { groupId: string; goal: number }) => {
      await apiRequest("PUT", `/api/groups/${groupId}/individual-goal`, { goal });
      return { groupId, goal };
    },
    onSuccess: (data) => {
      if (selectedGroup) {
        setSelectedGroup({ ...selectedGroup, myIndividualGoal: data.goal });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', selectedGroup?.id, 'leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', selectedGroup?.id, 'members'] });
      setShowSetGoal(false);
      setIndividualGoalInput('');
    },
  });

  const effectiveExerciseType = exerciseType === 'Other' ? (customExercise.trim() || 'Other') : exerciseType;

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      setCreateError('Enter a group name');
      return;
    }
    if (exerciseType === 'Other' && !customExercise.trim()) {
      setCreateError('Enter a name for your workout type');
      return;
    }
    const goal = parseInt(groupGoal);
    if (goalType === 'group' && (!goal || goal < 1)) {
      setCreateError('Enter a valid goal');
      return;
    }
    if (!calStartDate || !calEndDate) {
      setCreateError('Select start and end dates');
      return;
    }

    const sd = format(calStartDate, 'yyyy-MM-dd');
    const ed = format(calEndDate, 'yyyy-MM-dd');

    createGroupMutation.mutate({
      name: groupName.trim(),
      exerciseType: effectiveExerciseType,
      goalType,
      totalGoal: goalType === 'individual' ? 0 : goal,
      startDate: sd,
      endDate: ed,
    });
  };

  const handleJoinGroup = () => {
    if (!inviteCode.trim()) {
      setJoinError('Enter an invite code');
      return;
    }
    joinGroupMutation.mutate(inviteCode.trim());
  };

  const handleLeaveGroup = (group: GroupData) => {
    Alert.alert('Leave Group', `Leave "${group.name}"? Your data for this group will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leaveGroupMutation.mutate(group.id) },
    ]);
  };

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await apiRequest("DELETE", `/api/challenges/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      refresh();
      setViewMode('list');
      setSelectedGroup(null);
    },
  });

  const handleDeleteGroup = (group: GroupData) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"? This will remove the group and all its data for all members. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteGroupMutation.mutate(group.id) },
      ]
    );
  };

  const handleSetIndividualGoal = () => {
    const goal = parseInt(individualGoalInput);
    if (!goal || goal < 1 || !selectedGroup) return;
    setIndividualGoalMutation.mutate({ groupId: selectedGroup.id, goal });
  };

  const openGroup = (group: GroupData) => {
    setSelectedGroup(group);
    setViewMode('detail');
    setShowSetGoal(false);
    queryClient.invalidateQueries({ queryKey: ['/api/groups', group.id, 'leaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['/api/groups', group.id, 'members'] });
  };

  const getExerciseUnit = (type: string) => {
    return type.toLowerCase();
  };

  const renderGroupList = () => {
    const allGroups = groupsQuery.data || [];
    const groups = allGroups.filter(g => !g.isPersonal);

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, {
          paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 10,
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 90,
        }]}
        refreshControl={
          <RefreshControl refreshing={groupsQuery.isRefetching} onRefresh={() => groupsQuery.refetch()} />
        }
      >
        <Text style={[styles.screenTitle, { color: colors.text }]}>Groups</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.tint }]}
            onPress={() => { setViewMode('create'); setCreateError(''); }}
            testID="create-group-btn"
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={() => { setViewMode('join'); setJoinError(''); }}
            testID="join-group-btn"
          >
            <Ionicons name="enter" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Join</Text>
          </TouchableOpacity>
        </View>

        {groupsQuery.isLoading ? (
          <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
        ) : groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Groups Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Create a group to challenge friends, or join one with an invite code
            </Text>
          </View>
        ) : (
          groups.map((group) => {
            const totalDays = differenceInDays(parseISO(group.endDate), parseISO(group.startDate)) + 1;
            const isActive = activeChallengeId === group.id;
            const goalDisplay = group.goalType === 'individual'
              ? (group.myIndividualGoal ? `${group.myIndividualGoal.toLocaleString()} ${getExerciseUnit(group.exerciseType)}` : 'Set your goal')
              : `${group.totalGoal.toLocaleString()} ${getExerciseUnit(group.exerciseType)}`;
            return (
              <TouchableOpacity
                key={group.id}
                style={[styles.groupCard, {
                  backgroundColor: colors.card,
                  borderColor: isActive ? colors.tint : colors.border,
                  borderWidth: isActive ? 2 : 1,
                }]}
                onPress={() => openGroup(group)}
                testID={`group-card-${group.id}`}
              >
                <View style={styles.groupCardHeader}>
                  <View style={[styles.groupIcon, { backgroundColor: isActive ? colors.tint + '30' : colors.tint + '20' }]}>
                    <Ionicons name={isActive ? "flame" : "people"} size={24} color={colors.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.groupName, { color: colors.text }]}>
                      {group.name}{isActive ? ' (Active)' : ''}
                    </Text>
                    <Text style={[styles.groupMeta, { color: colors.textSecondary }]}>
                      {goalDisplay} in {totalDays} days
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
                <View style={[styles.groupCardFooter, { borderTopColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.groupDateRange, { color: colors.textSecondary }]}>
                      {format(parseISO(group.startDate), 'MMM d')} - {format(parseISO(group.endDate), 'MMM d, yyyy')}
                    </Text>
                    <View style={[styles.exerciseBadge, { backgroundColor: colors.tint + '15' }]}>
                      <Text style={[styles.exerciseBadgeText, { color: colors.tint }]}>{group.exerciseType}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.codeBadge, { backgroundColor: colors.tint + '15', flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      Clipboard.setStringAsync(group.inviteCode);
                      Alert.alert('Copied', 'Invite code copied to clipboard');
                    }}
                  >
                    <Text style={[styles.codeText, { color: colors.tint }]}>{group.inviteCode}</Text>
                    <Ionicons name="copy-outline" size={14} color={colors.tint} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    );
  };

  const renderCreateGroup = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scrollContent, {
        paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 10,
        paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 90,
      }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setViewMode('list')} testID="back-to-list">
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text, flex: 1, textAlign: 'center' }]}>New Group</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>GROUP NAME</Text>
      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="e.g., Office Challenge"
          placeholderTextColor={colors.textSecondary}
          value={groupName}
          onChangeText={setGroupName}
          testID="group-name-input"
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>EXERCISE TYPE</Text>
      <TouchableOpacity
        style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}
        onPress={() => setShowExercisePicker(!showExercisePicker)}
        testID="exercise-type-picker"
      >
        <Ionicons name="fitness" size={20} color={colors.tint} style={{ marginRight: 10 }} />
        <Text style={[styles.input, { color: colors.text, flex: 1 }]}>{exerciseType}</Text>
        <Ionicons name={showExercisePicker ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {showExercisePicker && (
        <View style={[styles.pickerDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {EXERCISE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.pickerItem,
                  exerciseType === type && { backgroundColor: colors.tint + '15' },
                ]}
                onPress={() => {
                  setExerciseType(type);
                  setShowExercisePicker(false);
                }}
              >
                <Text style={[
                  styles.pickerItemText,
                  { color: exerciseType === type ? colors.tint : colors.text },
                ]}>{type}</Text>
                {exerciseType === type && <Ionicons name="checkmark" size={18} color={colors.tint} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {exerciseType === 'Other' && (
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}>
          <Ionicons name="create-outline" size={20} color={colors.tint} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.input, { color: colors.text, flex: 1 }]}
            value={customExercise}
            onChangeText={setCustomExercise}
            placeholder="Enter workout name"
            placeholderTextColor={colors.textSecondary}
            maxLength={30}
            autoFocus
          />
        </View>
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>GOAL TYPE</Text>
      <View style={styles.goalTypeRow}>
        <TouchableOpacity
          style={[
            styles.goalTypeChip,
            { borderColor: colors.border },
            goalType === 'group' && { backgroundColor: colors.tint, borderColor: colors.tint },
          ]}
          onPress={() => setGoalType('group')}
        >
          <Ionicons name="people" size={16} color={goalType === 'group' ? '#fff' : colors.text} />
          <Text style={[
            styles.goalTypeText,
            { color: goalType === 'group' ? '#fff' : colors.text },
          ]}>Group Goal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.goalTypeChip,
            { borderColor: colors.border },
            goalType === 'individual' && { backgroundColor: colors.tint, borderColor: colors.tint },
          ]}
          onPress={() => setGoalType('individual')}
        >
          <Ionicons name="person" size={16} color={goalType === 'individual' ? '#fff' : colors.text} />
          <Text style={[
            styles.goalTypeText,
            { color: goalType === 'individual' ? '#fff' : colors.text },
          ]}>Individual Goals</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.goalTypeHint, { color: colors.textSecondary }]}>
        {goalType === 'group'
          ? 'Everyone works toward the same shared goal'
          : 'Each member sets their own personal goal'}
      </Text>

      {goalType === 'group' && (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>TOTAL GOAL ({effectiveExerciseType.toUpperCase()})</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g., 1000"
              placeholderTextColor={colors.textSecondary}
              value={groupGoal}
              onChangeText={setGroupGoal}
              keyboardType="number-pad"
              testID="group-goal-input"
            />
          </View>
        </>
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>CHALLENGE DATES</Text>
      <CalendarDateRangePicker
        startDate={calStartDate}
        endDate={calEndDate}
        onSelectStart={(d) => { setCalStartDate(d); setCalEndDate(null); }}
        onSelectEnd={setCalEndDate}
      />

      {calStartDate && calEndDate && (
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {goalType === 'group' && parseInt(groupGoal) > 0 && (
            <Text style={[styles.summaryTarget, { color: colors.tint }]}>
              ~{Math.ceil(parseInt(groupGoal) / (differenceInCalendarDays(calEndDate, calStartDate) + 1))} {getExerciseUnit(effectiveExerciseType)}/day per member
            </Text>
          )}
          {goalType === 'individual' && (
            <Text style={[styles.summaryTarget, { color: colors.tint }]}>
              Members will set their own goals after joining
            </Text>
          )}
        </View>
      )}

      {createError ? <Text style={[styles.errorText, { color: colors.error }]}>{createError}</Text> : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleCreateGroup}
        disabled={createGroupMutation.isPending}
        testID="create-group-submit"
      >
        <LinearGradient
          colors={['#FF6B35', '#FF9F1C']}
          style={styles.primaryButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {createGroupMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Group</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderJoinGroup = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scrollContent, {
        paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 10,
        paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 90,
      }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setViewMode('list')} testID="back-to-list-join">
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text, flex: 1, textAlign: 'center' }]}>Join Group</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.joinSection}>
        <Ionicons name="ticket-outline" size={48} color={colors.tint} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={[styles.joinHint, { color: colors.textSecondary }]}>
          Enter the 6-character invite code shared by the group creator
        </Text>

        <View style={[styles.codeInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.codeInput, { color: colors.text }]}
            placeholder="ABCDEF"
            placeholderTextColor={colors.textSecondary}
            value={inviteCode}
            onChangeText={(t) => setInviteCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            testID="join-code-input"
          />
        </View>

        {joinError ? <Text style={[styles.errorText, { color: colors.error }]}>{joinError}</Text> : null}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleJoinGroup}
          disabled={joinGroupMutation.isPending}
          testID="join-group-submit"
        >
          <LinearGradient
            colors={['#34C759', '#30D158']}
            style={styles.primaryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {joinGroupMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Join Group</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderGroupDetail = () => {
    if (!selectedGroup) return null;

    const leaderboard = leaderboardQuery.data || [];
    const members = membersQuery.data || [];
    const totalDays = differenceInDays(parseISO(selectedGroup.endDate), parseISO(selectedGroup.startDate)) + 1;
    const isCreator = selectedGroup.createdBy === user?.id;
    const isIndividualGoalType = selectedGroup.goalType === 'individual';

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, {
          paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 10,
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 90,
        }]}
        refreshControl={
          <RefreshControl
            refreshing={leaderboardQuery.isRefetching}
            onRefresh={() => {
              leaderboardQuery.refetch();
              membersQuery.refetch();
            }}
          />
        }
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => { setViewMode('list'); setSelectedGroup(null); }} testID="back-to-list-detail">
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: colors.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
            {selectedGroup.name}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.detailInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Exercise</Text>
            <View style={[styles.exerciseBadge, { backgroundColor: colors.tint + '15' }]}>
              <Text style={[styles.exerciseBadgeText, { color: colors.tint }]}>{selectedGroup.exerciseType}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Goal Type</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {isIndividualGoalType ? 'Individual' : 'Group'}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {!isIndividualGoalType && (
            <>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Goal</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedGroup.totalGoal.toLocaleString()} {getExerciseUnit(selectedGroup.exerciseType)}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}
          {isIndividualGoalType && (
            <>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Your Goal</Text>
                {selectedGroup.myIndividualGoal ? (
                  <TouchableOpacity onPress={() => {
                    setIndividualGoalInput(selectedGroup.myIndividualGoal?.toString() || '');
                    setShowSetGoal(true);
                  }}>
                    <Text style={[styles.detailValue, { color: colors.tint }]}>
                      {selectedGroup.myIndividualGoal.toLocaleString()} {getExerciseUnit(selectedGroup.exerciseType)}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.setGoalMiniBtn, { backgroundColor: colors.tint + '15' }]}
                    onPress={() => setShowSetGoal(true)}
                  >
                    <Text style={[styles.setGoalMiniBtnText, { color: colors.tint }]}>Set Goal</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Dates</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {format(parseISO(selectedGroup.startDate), 'MMM d')} - {format(parseISO(selectedGroup.endDate), 'MMM d')}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Duration</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{totalDays} days</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Invite Code</Text>
            <TouchableOpacity
              style={[styles.codeBadgeLarge, { backgroundColor: colors.tint + '15', flexDirection: 'row', alignItems: 'center', gap: 6 }]}
              onPress={() => {
                Clipboard.setStringAsync(selectedGroup.inviteCode);
                Alert.alert('Copied', 'Invite code copied to clipboard');
              }}
            >
              <Text style={[styles.codeLargeText, { color: colors.tint }]}>{selectedGroup.inviteCode}</Text>
              <Ionicons name="copy-outline" size={16} color={colors.tint} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Members</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{members.length}</Text>
          </View>
        </View>

        {showSetGoal && isIndividualGoalType && (
          <View style={[styles.setGoalCard, { backgroundColor: colors.card, borderColor: colors.tint + '40' }]}>
            <Text style={[styles.setGoalTitle, { color: colors.text }]}>Set Your Goal</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={`e.g., 500 ${getExerciseUnit(selectedGroup.exerciseType)}`}
                placeholderTextColor={colors.textSecondary}
                value={individualGoalInput}
                onChangeText={setIndividualGoalInput}
                keyboardType="number-pad"
                testID="individual-goal-input"
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
                onPress={() => setShowSetGoal(false)}
              >
                <Text style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: colors.tint }}
                onPress={handleSetIndividualGoal}
                disabled={setIndividualGoalMutation.isPending}
              >
                {setIndividualGoalMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Leaderboard</Text>

        {leaderboardQuery.isLoading ? (
          <ActivityIndicator size="small" color={colors.tint} style={{ marginTop: 20 }} />
        ) : leaderboard.length === 0 ? (
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary, textAlign: 'center', marginTop: 20 }]}>
            No activity yet
          </Text>
        ) : (
          leaderboard.map((entry) => {
            const isMe = entry.userId === user?.id;
            const effectiveGoal = entry.goalType === 'individual'
              ? (entry.individualGoal || 0)
              : entry.groupGoal;
            const pct = effectiveGoal > 0 ? Math.round((entry.totalCount / effectiveGoal) * 100) : 0;
            return (
              <View
                key={entry.userId}
                style={[
                  styles.leaderboardRow,
                  { backgroundColor: isMe ? colors.tint + '10' : colors.card, borderColor: isMe ? colors.tint + '40' : colors.border },
                ]}
              >
                <View style={[styles.rankBadge, {
                  backgroundColor: entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : entry.rank === 3 ? '#CD7F32' : colors.progressBackground,
                }]}>
                  <Text style={[styles.rankText, {
                    color: entry.rank <= 3 ? '#fff' : colors.text,
                  }]}>{entry.rank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.leaderName, { color: colors.text }]}>
                    {entry.displayName}{isMe ? ' (You)' : ''}
                  </Text>
                  <View style={[styles.progressBar, { backgroundColor: colors.progressBackground }]}>
                    <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%`, backgroundColor: colors.tint }]} />
                  </View>
                </View>
                <View style={styles.leaderStats}>
                  <Text style={[styles.leaderCount, { color: colors.text }]}>{entry.totalCount.toLocaleString()}</Text>
                  <Text style={[styles.leaderUnit, { color: colors.textSecondary }]}>{getExerciseUnit(entry.exerciseType)}</Text>
                  {effectiveGoal > 0 && (
                    <Text style={[styles.leaderPct, { color: colors.textSecondary }]}>{pct}%</Text>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={styles.actionButtonsContainer}>
          {isCreator ? (
            <TouchableOpacity
              style={[styles.destructiveButton, { borderColor: colors.error }]}
              onPress={() => handleDeleteGroup(selectedGroup)}
              testID="delete-group-btn"
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.destructiveButtonText, { color: colors.error }]}>Delete Group</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.destructiveButton, { borderColor: colors.error }]}
              onPress={() => handleLeaveGroup(selectedGroup)}
              testID="leave-group-btn"
            >
              <Ionicons name="exit-outline" size={18} color={colors.error} />
              <Text style={[styles.destructiveButtonText, { color: colors.error }]}>Leave Group</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {viewMode === 'list' && renderGroupList()}
      {viewMode === 'create' && renderCreateGroup()}
      {viewMode === 'join' && renderJoinGroup()}
      {viewMode === 'detail' && renderGroupDetail()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  screenTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, gap: 8,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold' },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  groupCard: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  groupCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  groupIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  groupName: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  groupMeta: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  groupCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  groupDateRange: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  exerciseBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  exerciseBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  codeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  codeText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 8, letterSpacing: 0.5 },
  inputContainer: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, height: 52, justifyContent: 'center', marginBottom: 16 },
  input: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  pickerDropdown: { borderRadius: 14, borderWidth: 1, marginTop: -10, marginBottom: 16, overflow: 'hidden' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  pickerItemText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  goalTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  goalTypeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 6,
  },
  goalTypeText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  goalTypeHint: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 16 },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16, alignItems: 'center', gap: 4 },
  summaryText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  summaryTarget: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  errorText: { fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: 'center', marginBottom: 8 },
  primaryButton: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  primaryButtonGradient: { paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  joinSection: { marginTop: 20 },
  joinHint: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  codeInputContainer: { borderRadius: 14, borderWidth: 1, height: 64, justifyContent: 'center', marginBottom: 16 },
  codeInput: { fontSize: 28, fontFamily: 'Inter_700Bold', textAlign: 'center', letterSpacing: 8 },
  detailInfoCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  detailLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  detailValue: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  divider: { height: 1 },
  codeBadgeLarge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  codeLargeText: { fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  sectionTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 14 },
  leaderboardRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 14, borderWidth: 1, marginBottom: 8, gap: 12,
  },
  rankBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  leaderName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  leaderStats: { alignItems: 'flex-end' },
  leaderCount: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  leaderUnit: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  leaderPct: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  actionButtonsContainer: { marginTop: 24, gap: 12 },
  destructiveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 8,
  },
  destructiveButtonText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  trackButton: { borderRadius: 14, overflow: 'hidden', marginBottom: 8 },
  activeGroupBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1,
    marginBottom: 8, gap: 8,
  },
  activeGroupText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1 },
  setGoalCard: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16, gap: 12,
  },
  setGoalTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  setGoalMiniBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  setGoalMiniBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
