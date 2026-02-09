var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  AGE_RANGES: () => AGE_RANGES,
  EXERCISE_TYPES: () => EXERCISE_TYPES,
  GENDER_OPTIONS: () => GENDER_OPTIONS,
  dailyLogs: () => dailyLogs,
  groupMembers: () => groupMembers,
  groups: () => groups,
  insertDailyLogSchema: () => insertDailyLogSchema,
  insertGroupSchema: () => insertGroupSchema,
  insertUserSchema: () => insertUserSchema,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var AGE_RANGES = [
  "Under 18",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+"
];
var GENDER_OPTIONS = [
  "Male",
  "Female",
  "Other",
  "Prefer not to answer"
];
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  password: text("password").notNull(),
  ageRange: text("age_range"),
  gender: text("gender"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  exerciseType: text("exercise_type").notNull().default("Push-ups"),
  goalType: text("goal_type").notNull().default("group"),
  totalGoal: integer("total_goal").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isPersonal: boolean("is_personal").notNull().default(false),
  status: text("status").notNull().default("active"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  individualGoal: integer("individual_goal"),
  joinedAt: timestamp("joined_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex("group_user_unique").on(table.groupId, table.userId)
]);
var dailyLogs = pgTable("daily_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  date: date("date").notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex("user_group_date_unique").on(table.userId, table.groupId, table.date)
]);
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  displayName: true,
  password: true,
  ageRange: true,
  gender: true
});
var insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
  exerciseType: true,
  goalType: true,
  totalGoal: true,
  startDate: true,
  endDate: true
});
var insertDailyLogSchema = createInsertSchema(dailyLogs).pick({
  groupId: true,
  date: true,
  count: true
});
var EXERCISE_TYPES = [
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
  "Other"
];

// server/db.ts
var connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("No database connection string found. Set EXTERNAL_DATABASE_URL or DATABASE_URL.");
}
var pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 1e4,
  idleTimeoutMillis: 3e4,
  max: 10
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, and, sql as sql2, desc } from "drizzle-orm";
function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
async function getUser(id) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}
async function getUserByUsername(username) {
  const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
  return user;
}
async function createUser(data) {
  const [user] = await db.insert(users).values({
    ...data,
    username: data.username.toLowerCase()
  }).returning();
  return user;
}
async function createGroup(data) {
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
    inviteCode
  }).returning();
  await db.insert(groupMembers).values({
    groupId: group.id,
    userId: data.createdBy
  });
  return group;
}
async function getGroupByInviteCode(code) {
  const [group] = await db.select().from(groups).where(eq(groups.inviteCode, code.toUpperCase()));
  return group;
}
async function getGroup(id) {
  const [group] = await db.select().from(groups).where(eq(groups.id, id));
  return group;
}
async function joinGroup(groupId, userId) {
  await db.insert(groupMembers).values({
    groupId,
    userId
  }).onConflictDoNothing();
}
async function getChallengesForUser(userId) {
  const memberships = await db.select({
    group: groups,
    joinedAt: groupMembers.joinedAt,
    individualGoal: groupMembers.individualGoal
  }).from(groupMembers).innerJoin(groups, eq(groupMembers.groupId, groups.id)).where(and(eq(groupMembers.userId, userId), eq(groups.status, "active")));
  return memberships.map((m) => ({
    ...m.group,
    myIndividualGoal: m.individualGoal
  }));
}
async function getGroupsForUser(userId) {
  return getChallengesForUser(userId);
}
async function getGroupMembers(groupId) {
  const members = await db.select({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    joinedAt: groupMembers.joinedAt,
    individualGoal: groupMembers.individualGoal
  }).from(groupMembers).innerJoin(users, eq(groupMembers.userId, users.id)).where(eq(groupMembers.groupId, groupId));
  return members;
}
async function setIndividualGoal(groupId, userId, goal) {
  await db.update(groupMembers).set({ individualGoal: goal }).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
}
async function logPushups(data) {
  const [log2] = await db.insert(dailyLogs).values(data).onConflictDoUpdate({
    target: [dailyLogs.userId, dailyLogs.groupId, dailyLogs.date],
    set: {
      count: sql2`${dailyLogs.count} + ${data.count}`,
      updatedAt: sql2`now()`
    }
  }).returning();
  return log2;
}
async function setLogCount(data) {
  const [log2] = await db.insert(dailyLogs).values(data).onConflictDoUpdate({
    target: [dailyLogs.userId, dailyLogs.groupId, dailyLogs.date],
    set: {
      count: data.count,
      updatedAt: sql2`now()`
    }
  }).returning();
  return log2;
}
async function getUserLogsForGroup(userId, groupId) {
  return db.select().from(dailyLogs).where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.groupId, groupId))).orderBy(desc(dailyLogs.date));
}
async function deleteLogForDate(userId, groupId, date2) {
  await db.delete(dailyLogs).where(and(
    eq(dailyLogs.userId, userId),
    eq(dailyLogs.groupId, groupId),
    eq(dailyLogs.date, date2)
  ));
}
async function getLeaderboard(groupId, filters) {
  const group = await getGroup(groupId);
  const conditions = [eq(groupMembers.groupId, groupId)];
  if (filters?.ageRange && filters.ageRange !== "All") {
    conditions.push(eq(users.ageRange, filters.ageRange));
  }
  if (filters?.gender && filters.gender !== "All") {
    conditions.push(eq(users.gender, filters.gender));
  }
  const results = await db.select({
    userId: groupMembers.userId,
    displayName: users.displayName,
    individualGoal: groupMembers.individualGoal,
    ageRange: users.ageRange,
    gender: users.gender,
    totalCount: sql2`COALESCE(SUM(${dailyLogs.count}), 0)::int`.as("total_count")
  }).from(groupMembers).leftJoin(users, eq(groupMembers.userId, users.id)).leftJoin(
    dailyLogs,
    and(
      eq(dailyLogs.userId, groupMembers.userId),
      eq(dailyLogs.groupId, groupMembers.groupId)
    )
  ).where(and(...conditions)).groupBy(groupMembers.userId, users.displayName, groupMembers.individualGoal, users.ageRange, users.gender).orderBy(desc(sql2`total_count`));
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
    gender: r.gender
  }));
}
async function leaveGroup(groupId, userId) {
  await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  await db.delete(dailyLogs).where(and(eq(dailyLogs.groupId, groupId), eq(dailyLogs.userId, userId)));
}
async function completeChallenge(groupId, userId) {
  const group = await getGroup(groupId);
  if (!group) return;
  if (group.createdBy !== userId) return;
  await db.update(groups).set({ status: "completed" }).where(eq(groups.id, groupId));
}
async function deleteChallenge(groupId, userId) {
  const group = await getGroup(groupId);
  if (!group) return;
  if (group.createdBy !== userId) return;
  await db.delete(dailyLogs).where(eq(dailyLogs.groupId, groupId));
  await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId));
  await db.delete(groups).where(eq(groups.id, groupId));
}

// server/routes.ts
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}
async function registerRoutes(app2) {
  const PgStore = connectPgSimple(session);
  const isProduction = process.env.NODE_ENV === "production";
  app2.use(
    session({
      store: new PgStore({
        pool,
        createTableIfMissing: true
      }),
      secret: process.env.SESSION_SECRET || "repgather-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1e3,
        sameSite: isProduction ? "none" : "lax"
      }
    })
  );
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { username, displayName, password, ageRange, gender } = req.body;
      if (!username || !displayName || !password) {
        return res.status(400).json({ message: "Email, display name, and password are required" });
      }
      if (!ageRange || !gender) {
        return res.status(400).json({ message: "Age range and gender are required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(username)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }
      if (password.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters" });
      }
      const existing = await getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }
      const user = await createUser({ username, displayName, password, ageRange, gender });
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, displayName: user.displayName, ageRange: user.ageRange, gender: user.gender });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const user = await getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, displayName: user.displayName, ageRange: user.ageRange, gender: user.gender });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const user = await getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {
        });
        return res.status(401).json({ message: "User not found" });
      }
      res.json({ id: user.id, username: user.username, displayName: user.displayName, ageRange: user.ageRange, gender: user.gender });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
  app2.get("/api/challenges", requireAuth, async (req, res) => {
    try {
      const challenges = await getChallengesForUser(req.session.userId);
      res.json(challenges);
    } catch (error) {
      res.status(500).json({ message: "Failed to get challenges" });
    }
  });
  app2.post("/api/challenges/personal", requireAuth, async (req, res) => {
    try {
      const { name, exerciseType, totalGoal, startDate, endDate } = req.body;
      if (!name || !totalGoal || !startDate || !endDate) {
        return res.status(400).json({ message: "Name, goal, start date, and end date are required" });
      }
      const group = await createGroup({
        name,
        exerciseType: exerciseType || "Push-ups",
        goalType: "group",
        totalGoal,
        startDate,
        endDate,
        isPersonal: true,
        createdBy: req.session.userId
      });
      res.json(group);
    } catch (error) {
      console.error("Create personal challenge error:", error);
      res.status(500).json({ message: "Failed to create personal challenge" });
    }
  });
  app2.post("/api/challenges/:id/complete", requireAuth, async (req, res) => {
    try {
      await completeChallenge(req.params.id, req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Complete challenge error:", error);
      res.status(500).json({ message: "Failed to complete challenge" });
    }
  });
  app2.delete("/api/challenges/:id", requireAuth, async (req, res) => {
    try {
      await deleteChallenge(req.params.id, req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete challenge error:", error);
      res.status(500).json({ message: "Failed to delete challenge" });
    }
  });
  app2.post("/api/groups", requireAuth, async (req, res) => {
    try {
      const { name, exerciseType, goalType, totalGoal, startDate, endDate } = req.body;
      if (!name || !startDate || !endDate) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (goalType !== "individual" && (!totalGoal || totalGoal < 1)) {
        return res.status(400).json({ message: "Goal is required for group goal type" });
      }
      const group = await createGroup({
        name,
        exerciseType: exerciseType || "Push-ups",
        goalType: goalType || "group",
        totalGoal,
        startDate,
        endDate,
        isPersonal: false,
        createdBy: req.session.userId
      });
      res.json(group);
    } catch (error) {
      console.error("Create group error:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });
  app2.get("/api/groups", requireAuth, async (req, res) => {
    try {
      const groups2 = await getGroupsForUser(req.session.userId);
      res.json(groups2);
    } catch (error) {
      res.status(500).json({ message: "Failed to get groups" });
    }
  });
  app2.get("/api/groups/:id", requireAuth, async (req, res) => {
    try {
      const group = await getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group" });
    }
  });
  app2.post("/api/groups/join", requireAuth, async (req, res) => {
    try {
      const { inviteCode } = req.body;
      if (!inviteCode) {
        return res.status(400).json({ message: "Invite code is required" });
      }
      const group = await getGroupByInviteCode(inviteCode.toUpperCase());
      if (!group) {
        return res.status(404).json({ message: "No group found with that code" });
      }
      if (group.isPersonal) {
        return res.status(400).json({ message: "Cannot join a personal challenge" });
      }
      await joinGroup(group.id, req.session.userId);
      res.json(group);
    } catch (error) {
      console.error("Join group error:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });
  app2.get("/api/groups/:id/members", requireAuth, async (req, res) => {
    try {
      const members = await getGroupMembers(req.params.id);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to get members" });
    }
  });
  app2.get("/api/groups/:id/leaderboard", requireAuth, async (req, res) => {
    try {
      const filters = {
        ageRange: req.query.ageRange,
        gender: req.query.gender
      };
      const leaderboard = await getLeaderboard(req.params.id, filters);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to get leaderboard" });
    }
  });
  app2.put("/api/groups/:id/individual-goal", requireAuth, async (req, res) => {
    try {
      const { goal } = req.body;
      if (!goal || goal < 1) {
        return res.status(400).json({ message: "Goal must be a positive number" });
      }
      await setIndividualGoal(req.params.id, req.session.userId, goal);
      res.json({ success: true });
    } catch (error) {
      console.error("Set individual goal error:", error);
      res.status(500).json({ message: "Failed to set individual goal" });
    }
  });
  app2.delete("/api/groups/:id/leave", requireAuth, async (req, res) => {
    try {
      await leaveGroup(req.params.id, req.session.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to leave group" });
    }
  });
  app2.post("/api/logs", requireAuth, async (req, res) => {
    try {
      const { groupId, date: date2, count } = req.body;
      if (!groupId || !date2 || count === void 0) {
        return res.status(400).json({ message: "groupId, date, and count are required" });
      }
      const log2 = await logPushups({
        userId: req.session.userId,
        groupId,
        date: date2,
        count
      });
      res.json(log2);
    } catch (error) {
      console.error("Log pushups error:", error);
      res.status(500).json({ message: "Failed to log pushups" });
    }
  });
  app2.put("/api/logs", requireAuth, async (req, res) => {
    try {
      const { groupId, date: date2, count } = req.body;
      if (!groupId || !date2 || count === void 0) {
        return res.status(400).json({ message: "groupId, date, and count are required" });
      }
      const log2 = await setLogCount({
        userId: req.session.userId,
        groupId,
        date: date2,
        count
      });
      res.json(log2);
    } catch (error) {
      res.status(500).json({ message: "Failed to update log" });
    }
  });
  app2.get("/api/logs/:groupId", requireAuth, async (req, res) => {
    try {
      const logs = await getUserLogsForGroup(req.session.userId, req.params.groupId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get logs" });
    }
  });
  app2.delete("/api/logs/:groupId/:date", requireAuth, async (req, res) => {
    try {
      await deleteLogForDate(req.session.userId, req.params.groupId, req.params.date);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete log" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  app.set("trust proxy", 1);
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
