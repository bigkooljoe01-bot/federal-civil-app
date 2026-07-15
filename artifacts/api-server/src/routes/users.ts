import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, usersTable, examSessionsTable } from "@workspace/db";
import {
  ListUsersQueryParams,
  GetUserParams,
  GetUserStatsParams,
  UpdateMeBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /users/me
router.get("/users/me", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.replitId, req.user.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    replitId: user.replitId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    createdAt: user.createdAt,
  });
});

// PATCH /users/me
router.patch("/users/me", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ username: parsed.data.username, updatedAt: new Date() })
    .where(eq(usersTable.replitId, req.user.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    replitId: user.replitId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    createdAt: user.createdAt,
  });
});

// GET /users (admin only)
router.get("/users", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = ListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page, limit, search } = parsed.data;
  const offset = (page - 1) * limit;

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.replitId, req.user.id));
  if (!currentUser || currentUser.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  let query = db.select().from(usersTable).$dynamic();
  if (search) {
    query = query.where(
      or(
        ilike(usersTable.username, `%${search}%`),
        ilike(usersTable.email, `%${search}%`),
      )
    );
  }

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable);

  const users = await query.limit(limit).offset(offset);

  res.json({
    users: users.map((u) => ({
      id: u.id,
      replitId: u.replitId,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      profileImageUrl: u.profileImageUrl,
      role: u.role,
      createdAt: u.createdAt,
    })),
    total: totalResult?.count ?? 0,
    page,
    limit,
  });
});

// GET /users/:userId (admin only)
router.get("/users/:userId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.replitId, req.user.id));
  if (!currentUser || currentUser.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    replitId: user.replitId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    createdAt: user.createdAt,
  });
});

// GET /users/:userId/stats
router.get("/users/:userId/stats", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetUserStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const sessions = await db
    .select()
    .from(examSessionsTable)
    .where(eq(examSessionsTable.userId, params.data.userId));

  const submitted = sessions.filter((s) => s.status === "submitted");
  const totalAttempts = submitted.length;
  const scores = submitted.map((s) => parseFloat(s.percentage ?? "0")).filter((n) => !isNaN(n));
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : null;
  const totalQuestionsAnswered = submitted.reduce((acc, s) => acc + (s.totalQuestions ?? 0), 0);
  const lastAttempt = submitted.sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime())[0];

  res.json({
    userId: params.data.userId,
    totalAttempts,
    averageScore: Math.round(averageScore * 100) / 100,
    totalQuestionsAnswered,
    bestScore: bestScore !== null ? Math.round(bestScore * 100) / 100 : null,
    lastAttemptAt: lastAttempt?.submittedAt ?? null,
  });
});

export default router;
