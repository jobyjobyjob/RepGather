import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groups = pgTable("groups", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  exerciseType: text("exercise_type").notNull().default("Push-ups"),
  goalType: text("goal_type").notNull().default("group"),
  totalGoal: integer("total_goal").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isPersonal: boolean("is_personal").notNull().default(false),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  individualGoal: integer("individual_goal"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("group_user_unique").on(table.groupId, table.userId),
]);

export const dailyLogs = pgTable("daily_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  date: date("date").notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_group_date_unique").on(table.userId, table.groupId, table.date),
]);

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  displayName: true,
  password: true,
});

export const insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
  exerciseType: true,
  goalType: true,
  totalGoal: true,
  startDate: true,
  endDate: true,
});

export const insertDailyLogSchema = createInsertSchema(dailyLogs).pick({
  groupId: true,
  date: true,
  count: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type DailyLog = typeof dailyLogs.$inferSelect;

export const EXERCISE_TYPES = [
  "Push-ups",
  "Sit-ups",
  "Squats",
  "Pull-ups",
  "Burpees",
  "Lunges",
  "Planks (seconds)",
  "Running (miles)",
  "Cycling (miles)",
  "Jump Rope",
  "Jumping Jacks",
  "Other",
] as const;
