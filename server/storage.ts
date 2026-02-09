import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users, groups, groupMembers, dailyLogs,
  type User, type InsertUser, type Group, type DailyLog
} from "@shared/schema";
import { randomUUID } from "crypto";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function getUser(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
  return user;
}

export async function createUser(data: InsertUser & { ageRange?: string; gender?: string }): Promise<User> {
  const [user] = await db.insert(users).values({
    ...data,
    username: data.username.toLowerCase(),
  }).returning();
  return user;
}

export async function createGroup(data: {
  name: string;
  exerciseType?: string;
  goalType?: string;
  totalGoal: number;
  startDate: string;
  endDate: string;
  isPersonal?: boolean;
  createdBy: string;
}): Promise<Group> {
  const inviteCode = generateInviteCode();
  const [group] = await db.insert(groups).values({
    name: data.name,
    exerciseType: data.exerciseType || "Push-ups",
    goalType: data.goalType || "group",
    totalGoal: data.totalGoal,
    startDate: data.startDate,
    endDate: data.endDate,
    isPersonal: data.isPersonal || false,
    createdBy: data.createdBy,
    inviteCode,
  }).returning();

  await db.insert(groupMembers).values({
    groupId: group.id,
    userId: data.createdBy,
  });

  return group;
}

export async function getGroupByInviteCode(code: string): Promise<Group | undefined> {
  const [group] = await db.select().from(groups).where(eq(groups.inviteCode, code.toUpperCase()));
  return group;
}

export async function getGroup(id: string): Promise<Group | undefined> {
  const [group] = await db.select().from(groups).where(eq(groups.id, id));
  return group;
}

export async function joinGroup(groupId: string, userId: string): Promise<void> {
  await db.insert(groupMembers).values({
    groupId,
    userId,
  }).onConflictDoNothing();
}

export async function getChallengesForUser(userId: string) {
  const memberships = await db
    .select({
      group: groups,
      joinedAt: groupMembers.joinedAt,
      individualGoal: groupMembers.individualGoal,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(and(eq(groupMembers.userId, userId), eq(groups.status, "active")));

  return memberships.map(m => ({
    ...m.group,
    myIndividualGoal: m.individualGoal,
  }));
}

export async function getGroupsForUser(userId: string) {
  return getChallengesForUser(userId);
}

export async function getGroupMembers(groupId: string) {
  const members = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      joinedAt: groupMembers.joinedAt,
      individualGoal: groupMembers.individualGoal,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  return members;
}

export async function setIndividualGoal(groupId: string, userId: string, goal: number): Promise<void> {
  await db
    .update(groupMembers)
    .set({ individualGoal: goal })
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
}

export async function getIndividualGoal(groupId: string, userId: string): Promise<number | null> {
  const [member] = await db
    .select({ individualGoal: groupMembers.individualGoal })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  return member?.individualGoal ?? null;
}

export async function logPushups(data: {
  userId: string;
  groupId: string;
  date: string;
  count: number;
}): Promise<DailyLog> {
  const [log] = await db
    .insert(dailyLogs)
    .values(data)
    .onConflictDoUpdate({
      target: [dailyLogs.userId, dailyLogs.groupId, dailyLogs.date],
      set: {
        count: sql`${dailyLogs.count} + ${data.count}`,
        updatedAt: sql`now()`,
      },
    })
    .returning();
  return log;
}

export async function setLogCount(data: {
  userId: string;
  groupId: string;
  date: string;
  count: number;
}): Promise<DailyLog> {
  const [log] = await db
    .insert(dailyLogs)
    .values(data)
    .onConflictDoUpdate({
      target: [dailyLogs.userId, dailyLogs.groupId, dailyLogs.date],
      set: {
        count: data.count,
        updatedAt: sql`now()`,
      },
    })
    .returning();
  return log;
}

export async function getUserLogsForGroup(userId: string, groupId: string): Promise<DailyLog[]> {
  return db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.groupId, groupId)))
    .orderBy(desc(dailyLogs.date));
}

export async function deleteLogForDate(userId: string, groupId: string, date: string): Promise<void> {
  await db
    .delete(dailyLogs)
    .where(and(
      eq(dailyLogs.userId, userId),
      eq(dailyLogs.groupId, groupId),
      eq(dailyLogs.date, date),
    ));
}

export async function getLeaderboard(groupId: string, filters?: { ageRange?: string; gender?: string }) {
  const group = await getGroup(groupId);

  const conditions = [eq(groupMembers.groupId, groupId)];

  if (filters?.ageRange && filters.ageRange !== 'All') {
    conditions.push(eq(users.ageRange, filters.ageRange));
  }
  if (filters?.gender && filters.gender !== 'All') {
    conditions.push(eq(users.gender, filters.gender));
  }

  const results = await db
    .select({
      userId: groupMembers.userId,
      displayName: users.displayName,
      individualGoal: groupMembers.individualGoal,
      ageRange: users.ageRange,
      gender: users.gender,
      totalCount: sql<number>`COALESCE(SUM(${dailyLogs.count}), 0)::int`.as("total_count"),
    })
    .from(groupMembers)
    .leftJoin(users, eq(groupMembers.userId, users.id))
    .leftJoin(
      dailyLogs,
      and(
        eq(dailyLogs.userId, groupMembers.userId),
        eq(dailyLogs.groupId, groupMembers.groupId),
      ),
    )
    .where(and(...conditions))
    .groupBy(groupMembers.userId, users.displayName, groupMembers.individualGoal, users.ageRange, users.gender)
    .orderBy(desc(sql`total_count`));

  return results.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    displayName: r.displayName || "Unknown",
    totalCount: r.totalCount || 0,
    individualGoal: r.individualGoal,
    groupGoal: group?.totalGoal || 0,
    exerciseType: group?.exerciseType || "Push-ups",
    goalType: group?.goalType || "group",
    ageRange: r.ageRange,
    gender: r.gender,
  }));
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  
  await db
    .delete(dailyLogs)
    .where(and(eq(dailyLogs.groupId, groupId), eq(dailyLogs.userId, userId)));
}

export async function completeChallenge(groupId: string, userId: string): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) return;
  if (group.createdBy !== userId) return;

  await db
    .update(groups)
    .set({ status: "completed" })
    .where(eq(groups.id, groupId));
}

export async function deleteUser(userId: string): Promise<void> {
  const userGroups = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.createdBy, userId));

  for (const group of userGroups) {
    await db.delete(dailyLogs).where(eq(dailyLogs.groupId, group.id));
    await db.delete(groupMembers).where(eq(groupMembers.groupId, group.id));
    await db.delete(groups).where(eq(groups.id, group.id));
  }

  await db.delete(dailyLogs).where(eq(dailyLogs.userId, userId));
  await db.delete(groupMembers).where(eq(groupMembers.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

export async function deleteChallenge(groupId: string, userId: string): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) return;
  if (group.createdBy !== userId) return;

  await db.delete(dailyLogs).where(eq(dailyLogs.groupId, groupId));
  await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId));
  await db.delete(groups).where(eq(groups.id, groupId));
}
