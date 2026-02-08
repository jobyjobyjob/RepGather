import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, useColorScheme, Platform,
  ActivityIndicator, RefreshControl, Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { usePushups, Challenge } from '@/contexts/PushupContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/query-client';
import { AGE_RANGES, GENDER_OPTIONS } from '@shared/schema';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalCount: number;
  individualGoal: number | null;
  groupGoal: number;
  exerciseType: string;
  goalType: string;
  ageRange: string | null;
  gender: string | null;
}

const AGE_FILTER_OPTIONS = ['All', ...AGE_RANGES];
const GENDER_FILTER_OPTIONS = ['All', ...GENDER_OPTIONS];

function FilterChip({ label, value, onPress, colors }: {
  label: string;
  value: string;
  onPress: () => void;
  colors: any;
}) {
  const isFiltered = value !== 'All';
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.filterChip,
        {
          backgroundColor: isFiltered ? colors.tint + '15' : colors.card,
          borderColor: isFiltered ? colors.tint : colors.border,
        },
      ]}
    >
      <Ionicons
        name="filter"
        size={14}
        color={isFiltered ? colors.tint : colors.textSecondary}
      />
      <Text
        style={[
          styles.filterChipText,
          { color: isFiltered ? colors.tint : colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {value === 'All' ? label : value}
      </Text>
      <Ionicons
        name="chevron-down"
        size={14}
        color={isFiltered ? colors.tint : colors.textSecondary}
      />
    </Pressable>
  );
}

function FilterModal({ visible, onClose, options, selectedValue, onSelect, title, colors }: {
  visible: boolean;
  onClose: () => void;
  options: readonly string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  title: string;
  colors: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={filterModalStyles.overlay}>
        <View style={[filterModalStyles.container, { backgroundColor: colors.card }]}>
          <View style={filterModalStyles.header}>
            <Text style={[filterModalStyles.title, { color: colors.text }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = item === selectedValue;
              return (
                <Pressable
                  onPress={() => { onSelect(item); onClose(); }}
                  style={[filterModalStyles.option, {
                    backgroundColor: isSelected ? colors.tint + '15' : 'transparent',
                  }]}
                >
                  <Text style={[filterModalStyles.optionText, {
                    color: isSelected ? colors.tint : colors.text,
                    fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  }]}>{item}</Text>
                  {isSelected && <Ionicons name="checkmark" size={22} color={colors.tint} />}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function ChallengePicker({ challenges, selectedId, onSelect, colors }: {
  challenges: Challenge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  colors: any;
}) {
  if (challenges.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.challengePickerContent}
      style={styles.challengePickerScroll}
    >
      {challenges.map((challenge) => {
        const isActive = challenge.id === selectedId;
        return (
          <Pressable
            key={challenge.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(challenge.id);
            }}
            style={[
              styles.challengeChip,
              {
                backgroundColor: isActive ? colors.tint : colors.card,
                borderColor: isActive ? colors.tint : colors.border,
              },
            ]}
          >
            <Ionicons
              name={challenge.isPersonal ? "person" : "people"}
              size={14}
              color={isActive ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.challengeChipText,
                {
                  color: isActive ? '#FFFFFF' : colors.text,
                  fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_500Medium',
                },
              ]}
              numberOfLines={1}
            >
              {challenge.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function LeaderboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { challenges, isLoading: challengesLoading } = usePushups();

  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [ageFilter, setAgeFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);

  const selectedChallenge = challenges.find(c => c.id === selectedChallengeId) || null;

  const leaderboardQuery = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/groups', selectedChallengeId, 'leaderboard', { ageRange: ageFilter, gender: genderFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (ageFilter !== 'All') params.set('ageRange', ageFilter);
      if (genderFilter !== 'All') params.set('gender', genderFilter);
      const queryStr = params.toString();
      const url = `/api/groups/${selectedChallengeId}/leaderboard${queryStr ? `?${queryStr}` : ''}`;
      const res = await apiRequest('GET', url);
      return res.json();
    },
    enabled: !!selectedChallengeId,
  });

  const handleSelectChallenge = useCallback((id: string) => {
    setSelectedChallengeId(id);
  }, []);

  const getExerciseUnit = (type: string) => type.toLowerCase();

  const hasActiveFilters = ageFilter !== 'All' || genderFilter !== 'All';

  if (challengesLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (challenges.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyState, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
          <Ionicons name="trophy-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Challenges Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Create or join a challenge to see leaderboards
          </Text>
        </View>
      </View>
    );
  }

  const leaderboard = leaderboardQuery.data || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, {
          paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 10,
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 90,
        }]}
        refreshControl={
          <RefreshControl
            refreshing={leaderboardQuery.isRefetching}
            onRefresh={() => leaderboardQuery.refetch()}
          />
        }
      >
        <Text style={[styles.screenTitle, { color: colors.text }]}>Leaderboard</Text>

        <ChallengePicker
          challenges={challenges}
          selectedId={selectedChallengeId}
          onSelect={handleSelectChallenge}
          colors={colors}
        />

        {selectedChallengeId && !selectedChallenge?.isPersonal && (
          <View style={styles.filtersRow}>
            <FilterChip
              label="Age"
              value={ageFilter}
              onPress={() => setShowAgeModal(true)}
              colors={colors}
            />
            <FilterChip
              label="Gender"
              value={genderFilter}
              onPress={() => setShowGenderModal(true)}
              colors={colors}
            />
            {hasActiveFilters && (
              <Pressable
                onPress={() => {
                  setAgeFilter('All');
                  setGenderFilter('All');
                }}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        )}

        {!selectedChallengeId ? (
          <View style={styles.selectPrompt}>
            <Ionicons name="hand-left-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.selectPromptText, { color: colors.textSecondary }]}>
              Select a challenge above to view its leaderboard
            </Text>
          </View>
        ) : leaderboardQuery.isLoading ? (
          <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
        ) : leaderboard.length === 0 ? (
          <View style={styles.selectPrompt}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {hasActiveFilters ? 'No Results' : 'No Activity Yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {hasActiveFilters
                ? 'Try adjusting your filters to see more results'
                : 'Start logging to see progress on the leaderboard'}
            </Text>
          </View>
        ) : (
          <View style={styles.leaderboardContainer}>
            {selectedChallenge && (
              <View style={[styles.challengeInfoBar, { backgroundColor: colors.card }]}>
                <View style={[styles.exerciseBadge, { backgroundColor: colors.tint + '15' }]}>
                  <Text style={[styles.exerciseBadgeText, { color: colors.tint }]}>
                    {selectedChallenge.exerciseType}
                  </Text>
                </View>
                <Text style={[styles.challengeInfoText, { color: colors.textSecondary }]}>
                  {selectedChallenge.isPersonal ? 'Personal' : 'Group'} Challenge
                </Text>
              </View>
            )}

            {leaderboard.map((entry) => {
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
                    {
                      backgroundColor: isMe ? colors.tint + '10' : colors.card,
                      borderColor: isMe ? colors.tint + '40' : colors.border,
                    },
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
                      <Text style={[styles.leaderPct, { color: pct >= 100 ? colors.success : colors.textSecondary }]}>{pct}%</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <FilterModal
        visible={showAgeModal}
        onClose={() => setShowAgeModal(false)}
        options={AGE_FILTER_OPTIONS}
        selectedValue={ageFilter}
        onSelect={setAgeFilter}
        title="Filter by Age Range"
        colors={colors}
      />

      <FilterModal
        visible={showGenderModal}
        onClose={() => setShowGenderModal(false)}
        options={GENDER_FILTER_OPTIONS}
        selectedValue={genderFilter}
        onSelect={setGenderFilter}
        title="Filter by Gender"
        colors={colors}
      />
    </View>
  );
}

const filterModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionText: {
    fontSize: 16,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, gap: 20 },
  screenTitle: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  challengePickerScroll: { marginHorizontal: -20 },
  challengePickerContent: { paddingHorizontal: 20, gap: 10 },
  challengeChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  challengeChipText: { fontSize: 14, maxWidth: 120 },
  filtersRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    maxWidth: 100,
  },
  selectPrompt: {
    alignItems: 'center' as const,
    marginTop: 60,
    gap: 12,
    paddingHorizontal: 20,
  },
  selectPromptText: { fontSize: 15, fontFamily: 'Inter_500Medium', textAlign: 'center' as const },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold' },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' as const, lineHeight: 20 },
  challengeInfoBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    marginBottom: 6,
  },
  exerciseBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  exerciseBadgeText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  challengeInfoText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  leaderboardContainer: { gap: 8 },
  leaderboardRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14,
    borderRadius: 14, borderWidth: 1, gap: 12,
  },
  rankBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center' as const, justifyContent: 'center' as const },
  rankText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  leaderName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' as const },
  progressFill: { height: '100%' as const, borderRadius: 3 },
  leaderStats: { alignItems: 'flex-end' as const },
  leaderCount: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  leaderUnit: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  leaderPct: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
});
