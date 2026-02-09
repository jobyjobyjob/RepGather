import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import * as storage from "./storage";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const PgStore = connectPgSimple(session);

  app.use(
    session({
      store: new PgStore({
        pool: pool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "repgather-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
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
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }
      const user = await storage.createUser({ username, displayName, password, ageRange, gender });
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, displayName: user.displayName, ageRange: user.ageRange, gender: user.gender });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, displayName: user.displayName, ageRange: user.ageRange, gender: user.gender });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }
      res.json({ id: user.id, username: user.username, displayName: user.displayName, ageRange: user.ageRange, gender: user.gender });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Challenges endpoint - returns all challenges (personal + group) for user
  app.get("/api/challenges", requireAuth, async (req: Request, res: Response) => {
    try {
      const challenges = await storage.getChallengesForUser(req.session.userId!);
      res.json(challenges);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get challenges" });
    }
  });

  // Create personal challenge
  app.post("/api/challenges/personal", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, exerciseType, totalGoal, startDate, endDate } = req.body;
      if (!name || !totalGoal || !startDate || !endDate) {
        return res.status(400).json({ message: "Name, goal, start date, and end date are required" });
      }
      const group = await storage.createGroup({
        name,
        exerciseType: exerciseType || "Push-ups",
        goalType: "group",
        totalGoal,
        startDate,
        endDate,
        isPersonal: true,
        createdBy: req.session.userId!,
      });
      res.json(group);
    } catch (error: any) {
      console.error("Create personal challenge error:", error);
      res.status(500).json({ message: "Failed to create personal challenge" });
    }
  });

  app.post("/api/challenges/:id/complete", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.completeChallenge(req.params.id as string, req.session.userId!);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Complete challenge error:", error);
      res.status(500).json({ message: "Failed to complete challenge" });
    }
  });

  // Delete a challenge (personal only, or group if creator)
  app.delete("/api/challenges/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteChallenge(req.params.id as string, req.session.userId!);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete challenge error:", error);
      res.status(500).json({ message: "Failed to delete challenge" });
    }
  });

  // Group routes
  app.post("/api/groups", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, exerciseType, goalType, totalGoal, startDate, endDate } = req.body;
      if (!name || !startDate || !endDate) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (goalType !== 'individual' && (!totalGoal || totalGoal < 1)) {
        return res.status(400).json({ message: "Goal is required for group goal type" });
      }
      const group = await storage.createGroup({
        name,
        exerciseType: exerciseType || "Push-ups",
        goalType: goalType || "group",
        totalGoal,
        startDate,
        endDate,
        isPersonal: false,
        createdBy: req.session.userId!,
      });
      res.json(group);
    } catch (error: any) {
      console.error("Create group error:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.get("/api/groups", requireAuth, async (req: Request, res: Response) => {
    try {
      const groups = await storage.getGroupsForUser(req.session.userId!);
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get groups" });
    }
  });

  app.get("/api/groups/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroup(req.params.id as string);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      res.json(group);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get group" });
    }
  });

  app.post("/api/groups/join", requireAuth, async (req: Request, res: Response) => {
    try {
      const { inviteCode } = req.body;
      if (!inviteCode) {
        return res.status(400).json({ message: "Invite code is required" });
      }
      const group = await storage.getGroupByInviteCode(inviteCode.toUpperCase());
      if (!group) {
        return res.status(404).json({ message: "No group found with that code" });
      }
      if (group.isPersonal) {
        return res.status(400).json({ message: "Cannot join a personal challenge" });
      }
      await storage.joinGroup(group.id, req.session.userId!);
      res.json(group);
    } catch (error: any) {
      console.error("Join group error:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });

  app.get("/api/groups/:id/members", requireAuth, async (req: Request, res: Response) => {
    try {
      const members = await storage.getGroupMembers(req.params.id as string);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get members" });
    }
  });

  app.get("/api/groups/:id/leaderboard", requireAuth, async (req: Request, res: Response) => {
    try {
      const filters = {
        ageRange: req.query.ageRange as string | undefined,
        gender: req.query.gender as string | undefined,
      };
      const leaderboard = await storage.getLeaderboard(req.params.id as string, filters);
      res.json(leaderboard);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get leaderboard" });
    }
  });

  app.put("/api/groups/:id/individual-goal", requireAuth, async (req: Request, res: Response) => {
    try {
      const { goal } = req.body;
      if (!goal || goal < 1) {
        return res.status(400).json({ message: "Goal must be a positive number" });
      }
      await storage.setIndividualGoal(req.params.id as string, req.session.userId!, goal);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Set individual goal error:", error);
      res.status(500).json({ message: "Failed to set individual goal" });
    }
  });

  app.delete("/api/groups/:id/leave", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.leaveGroup(req.params.id as string, req.session.userId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to leave group" });
    }
  });

  // Daily log routes
  app.post("/api/logs", requireAuth, async (req: Request, res: Response) => {
    try {
      const { groupId, date, count } = req.body;
      if (!groupId || !date || count === undefined) {
        return res.status(400).json({ message: "groupId, date, and count are required" });
      }
      const log = await storage.logPushups({
        userId: req.session.userId!,
        groupId,
        date,
        count,
      });
      res.json(log);
    } catch (error: any) {
      console.error("Log pushups error:", error);
      res.status(500).json({ message: "Failed to log pushups" });
    }
  });

  app.put("/api/logs", requireAuth, async (req: Request, res: Response) => {
    try {
      const { groupId, date, count } = req.body;
      if (!groupId || !date || count === undefined) {
        return res.status(400).json({ message: "groupId, date, and count are required" });
      }
      const log = await storage.setLogCount({
        userId: req.session.userId!,
        groupId,
        date,
        count,
      });
      res.json(log);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update log" });
    }
  });

  app.get("/api/logs/:groupId", requireAuth, async (req: Request, res: Response) => {
    try {
      const logs = await storage.getUserLogsForGroup(req.session.userId!, req.params.groupId as string);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get logs" });
    }
  });

  app.delete("/api/logs/:groupId/:date", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteLogForDate(req.session.userId!, req.params.groupId as string, req.params.date as string);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete log" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
