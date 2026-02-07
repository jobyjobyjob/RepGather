import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  ActivityIndicator, useColorScheme, Platform, Alert, ScrollView, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/query-client';

type ViewMode = 'list' | 'create' | 'join' | 'detail';

interface GroupData {
  id: string;
  name: string;
  inviteCode: string;
  totalGoal: number;
  startDate: string;
  endDate: string;
  createdBy: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalCount: number;
}

interface MemberData {
  id: string;
  username: string;
  displayName: string;
}

export default function GroupsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);

  const [groupName, setGroupName] = useState('');
  const [groupGoal, setGroupGoal] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');

  const [selectedMonth, setSelectedMonth] = useState(0);
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(28);

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + i);
    return d;
  });

  const currentMonth = months[selectedMonth];
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

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
    mutationFn: async (data: { name: string; totalGoal: number; startDate: string; endDate: string }) => {
      const res = await apiRequest("POST", "/api/groups", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setViewMode('list');
      setGroupName('');
      setGroupGoal('');
      setCreateError('');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setViewMode('list');
      setInviteCode('');
      setJoinError('');
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
      setViewMode('list');
      setSelectedGroup(null);
    },
  });

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      setCreateError('Enter a group name');
      return;
    }
    const goal = parseInt(groupGoal);
    if (!goal || goal < 1) {
      setCreateError('Enter a valid goal');
      return;
    }

    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), startDay);
    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), endDay);

    const sd = format(startDate, 'yyyy-MM-dd');
    const ed = format(endDate, 'yyyy-MM-dd');

    createGroupMutation.mutate({ name: groupName.trim(), totalGoal: goal, startDate: sd, endDate: ed });
  };

  const handleJoinGroup = () => {
    if (!inviteCode.trim()) {
      setJoinError('Enter an invite code');
      return;
    }
    joinGroupMutation.mutate(inviteCode.trim());
  };

  const handleLeaveGroup = (group: GroupData) => {
    Alert.alert('Leave Group', `Leave "${group.name}"? Your push-up data for this group will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leaveGroupMutation.mutate(group.id) },
    ]);
  };

  const openGroup = (group: GroupData) => {
    setSelectedGroup(group);
    setViewMode('detail');
    queryClient.invalidateQueries({ queryKey: ['/api/groups', group.id, 'leaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['/api/groups', group.id, 'members'] });
  };

  const renderGroupList = () => {
    const groups = groupsQuery.data || [];

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
            return (
              <TouchableOpacity
                key={group.id}
                style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openGroup(group)}
                testID={`group-card-${group.id}`}
              >
                <View style={styles.groupCardHeader}>
                  <View style={[styles.groupIcon, { backgroundColor: colors.tint + '20' }]}>
                    <Ionicons name="people" size={24} color={colors.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
                    <Text style={[styles.groupMeta, { color: colors.textSecondary }]}>
                      {group.totalGoal.toLocaleString()} push-ups in {totalDays} days
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
                <View style={[styles.groupCardFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.groupDateRange, { color: colors.textSecondary }]}>
                    {format(parseISO(group.startDate), 'MMM d')} - {format(parseISO(group.endDate), 'MMM d, yyyy')}
                  </Text>
                  <View style={[styles.codeBadge, { backgroundColor: colors.tint + '15' }]}>
                    <Text style={[styles.codeText, { color: colors.tint }]}>{group.inviteCode}</Text>
                  </View>
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

      <Text style={[styles.label, { color: colors.textSecondary }]}>TOTAL GOAL (PUSH-UPS)</Text>
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

      <Text style={[styles.label, { color: colors.textSecondary }]}>CHALLENGE MONTH</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthRow}>
        {months.map((m, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.monthChip,
              { borderColor: colors.border },
              selectedMonth === i && { backgroundColor: colors.tint, borderColor: colors.tint },
            ]}
            onPress={() => {
              setSelectedMonth(i);
              setStartDay(1);
              const nd = new Date(months[i].getFullYear(), months[i].getMonth() + 1, 0).getDate();
              setEndDay(nd);
            }}
          >
            <Text style={[
              styles.monthChipText,
              { color: colors.text },
              selectedMonth === i && { color: '#fff' },
            ]}>{format(m, 'MMM yyyy')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.datePickerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>START DAY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.dayChip,
                  { borderColor: colors.border },
                  startDay === d && { backgroundColor: colors.tint, borderColor: colors.tint },
                ]}
                onPress={() => {
                  setStartDay(d);
                  if (d > endDay) setEndDay(d);
                }}
              >
                <Text style={[
                  styles.dayChipText,
                  { color: colors.text },
                  startDay === d && { color: '#fff' },
                ]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
      <View style={styles.datePickerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>END DAY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Array.from({ length: daysInMonth - startDay + 1 }, (_, i) => startDay + i).map(d => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.dayChip,
                  { borderColor: colors.border },
                  endDay === d && { backgroundColor: colors.tint, borderColor: colors.tint },
                ]}
                onPress={() => setEndDay(d)}
              >
                <Text style={[
                  styles.dayChipText,
                  { color: colors.text },
                  endDay === d && { color: '#fff' },
                ]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          {format(currentMonth, 'MMM')} {startDay} - {format(currentMonth, 'MMM')} {endDay}, {currentMonth.getFullYear()} ({endDay - startDay + 1} days)
        </Text>
        {parseInt(groupGoal) > 0 && (
          <Text style={[styles.summaryTarget, { color: colors.tint }]}>
            ~{Math.ceil(parseInt(groupGoal) / (endDay - startDay + 1))} push-ups/day per member
          </Text>
        )}
      </View>

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
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Goal</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedGroup.totalGoal.toLocaleString()} push-ups</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
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
            <View style={[styles.codeBadgeLarge, { backgroundColor: colors.tint + '15' }]}>
              <Text style={[styles.codeLargeText, { color: colors.tint }]}>{selectedGroup.inviteCode}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Members</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{members.length}</Text>
          </View>
        </View>

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
            const pct = selectedGroup.totalGoal > 0 ? Math.round((entry.totalCount / selectedGroup.totalGoal) * 100) : 0;
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
                  <Text style={[styles.leaderPct, { color: colors.textSecondary }]}>{pct}%</Text>
                </View>
              </View>
            );
          })
        )}

        {!isCreator && (
          <TouchableOpacity
            style={[styles.leaveButton, { borderColor: colors.error }]}
            onPress={() => handleLeaveGroup(selectedGroup)}
            testID="leave-group-btn"
          >
            <Ionicons name="exit-outline" size={18} color={colors.error} />
            <Text style={[styles.leaveButtonText, { color: colors.error }]}>Leave Group</Text>
          </TouchableOpacity>
        )}
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
  groupDateRange: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  codeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  codeText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 8, letterSpacing: 0.5 },
  inputContainer: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, height: 52, justifyContent: 'center', marginBottom: 16 },
  input: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  monthRow: { marginBottom: 16 },
  monthChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginRight: 8 },
  monthChipText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  datePickerRow: { marginBottom: 12 },
  dayChip: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  dayChipText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16, alignItems: 'center', gap: 4 },
  summaryText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  summaryTarget: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  errorText: { fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: 'center', marginBottom: 8 },
  primaryButton: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  primaryButtonGradient: { paddingVertical: 16, alignItems: 'center' },
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
  leaderPct: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  leaveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginTop: 20, gap: 8,
  },
  leaveButtonText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
