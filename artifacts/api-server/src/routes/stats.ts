import { Router, type IRouter } from "express";
import { eq, sql, and, desc } from "drizzle-orm";
import {
  db, usersTable, questionsTable, examSessionsTable, examTypesTable, subjectsTable,
} from "@workspace/db";

const router: IRouter = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// GET /stats/dashboard (admin)
router.get("/stats/dashboard", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.replitId, req.user!.id));
  if (!dbUser || dbUser.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`count(*)::int` }).from(usersTable);
  const [{ totalQuestions }] = await db.select({ totalQuestions: sql<number>`count(*)::int` }).from(questionsTable);
  const [{ publishedQuestions }] = await db.select({ publishedQuestions: sql<number>`count(*)::int` }).from(questionsTable).where(eq(questionsTable.published, true));
  const [{ totalAttempts }] = await db.select({ totalAttempts: sql<number>`count(*)::int` }).from(examSessionsTable).where(eq(examSessionsTable.status, "submitted"));
  const [{ totalSubjects }] = await db.select({ totalSubjects: sql<number>`count(*)::int` }).from(subjectsTable);
  const [{ totalExamTypes }] = await db.select({ totalExamTypes: sql<number>`count(*)::int` }).from(examTypesTable);

  const recentSessionRows = await db
    .select({
      s: examSessionsTable,
      examTypeName: examTypesTable.name,
      subjectName: subjectsTable.name,
      username: usersTable.username,
    })
    .from(examSessionsTable)
    .leftJoin(examTypesTable, eq(examSessionsTable.examTypeId, examTypesTable.id))
    .leftJoin(subjectsTable, eq(examSessionsTable.subjectId, subjectsTable.id))
    .leftJoin(usersTable, eq(examSessionsTable.userId, usersTable.id))
    .where(eq(examSessionsTable.status, "submitted"))
    .orderBy(desc(examSessionsTable.submittedAt))
    .limit(10);

  const recentAttempts = recentSessionRows.map(({ s, examTypeName, subjectName }) => ({
    sessionId: s.id,
    examTypeName: examTypeName ?? "",
    subjectName: subjectName ?? "",
    year: s.year,
    score: parseFloat(s.score ?? "0"),
    percentage: parseFloat(s.percentage ?? "0"),
    passed: s.passed ?? false,
    totalQuestions: s.totalQuestions ?? 0,
    correct: s.correct ?? 0,
    submittedAt: s.submittedAt,
  }));

  res.json({
    totalUsers: totalUsers ?? 0,
    totalQuestions: totalQuestions ?? 0,
    publishedQuestions: publishedQuestions ?? 0,
    totalAttempts: totalAttempts ?? 0,
    totalSubjects: totalSubjects ?? 0,
    totalExamTypes: totalExamTypes ?? 0,
    recentAttempts,
  });
});

// GET /my-attempts
router.get("/my-attempts", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.replitId, req.user!.id));
  if (!dbUser) {
    res.json({ attempts: [], total: 0, page: 1, limit: 20 });
    return;
  }

  const page = parseInt((req.query.page as string) ?? "1", 10) || 1;
  const limit = parseInt((req.query.limit as string) ?? "20", 10) || 20;
  const offset = (page - 1) * limit;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(examSessionsTable)
    .where(and(eq(examSessionsTable.userId, dbUser.id), eq(examSessionsTable.status, "submitted")));

  const rows = await db
    .select({
      s: examSessionsTable,
      examTypeName: examTypesTable.name,
      subjectName: subjectsTable.name,
    })
    .from(examSessionsTable)
    .leftJoin(examTypesTable, eq(examSessionsTable.examTypeId, examTypesTable.id))
    .leftJoin(subjectsTable, eq(examSessionsTable.subjectId, subjectsTable.id))
    .where(and(eq(examSessionsTable.userId, dbUser.id), eq(examSessionsTable.status, "submitted")))
    .orderBy(desc(examSessionsTable.submittedAt))
    .limit(limit)
    .offset(offset);

  const attempts = rows.map(({ s, examTypeName, subjectName }) => ({
    sessionId: s.id,
    examTypeName: examTypeName ?? "",
    subjectName: subjectName ?? "",
    year: s.year,
    score: parseFloat(s.score ?? "0"),
    percentage: parseFloat(s.percentage ?? "0"),
    passed: s.passed ?? false,
    totalQuestions: s.totalQuestions ?? 0,
    correct: s.correct ?? 0,
    submittedAt: s.submittedAt,
  }));

  res.json({ attempts, total: count ?? 0, page, limit });
});

// GET /stats/my-progress
router.get("/stats/my-progress", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.replitId, req.user!.id));
  if (!dbUser) {
    res.json({
      totalAttempts: 0,
      averageScore: 0,
      totalQuestionsAnswered: 0,
      bestScore: null,
      recentAttempts: [],
      subjectBreakdown: [],
    });
    return;
  }

  const sessions = await db
    .select({
      s: examSessionsTable,
      examTypeName: examTypesTable.name,
      subjectName: subjectsTable.name,
      subjectId: subjectsTable.id,
    })
    .from(examSessionsTable)
    .leftJoin(examTypesTable, eq(examSessionsTable.examTypeId, examTypesTable.id))
    .leftJoin(subjectsTable, eq(examSessionsTable.subjectId, subjectsTable.id))
    .where(and(eq(examSessionsTable.userId, dbUser.id), eq(examSessionsTable.status, "submitted")))
    .orderBy(desc(examSessionsTable.submittedAt));

  const submitted = sessions;
  const totalAttempts = submitted.length;
  const percentages = submitted.map((r) => parseFloat(r.s.percentage ?? "0"));
  const averageScore = percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0;
  const bestScore = percentages.length > 0 ? Math.max(...percentages) : null;
  const totalQuestionsAnswered = submitted.reduce((acc, r) => acc + (r.s.totalQuestions ?? 0), 0);

  const recentAttempts = submitted.slice(0, 10).map(({ s, examTypeName, subjectName }) => ({
    sessionId: s.id,
    examTypeName: examTypeName ?? "",
    subjectName: subjectName ?? "",
    year: s.year,
    score: parseFloat(s.score ?? "0"),
    percentage: parseFloat(s.percentage ?? "0"),
    passed: s.passed ?? false,
    totalQuestions: s.totalQuestions ?? 0,
    correct: s.correct ?? 0,
    submittedAt: s.submittedAt,
  }));

  // Subject breakdown
  const subjectMap = new Map<number, { subjectId: number; subjectName: string; attempts: number; totalPct: number }>();
  for (const { s, subjectId, subjectName } of submitted) {
    if (!subjectId) continue;
    const pct = parseFloat(s.percentage ?? "0");
    if (subjectMap.has(subjectId)) {
      const entry = subjectMap.get(subjectId)!;
      entry.attempts++;
      entry.totalPct += pct;
    } else {
      subjectMap.set(subjectId, { subjectId, subjectName: subjectName ?? "", attempts: 1, totalPct: pct });
    }
  }

  const subjectBreakdown = Array.from(subjectMap.values()).map((s) => ({
    subjectId: s.subjectId,
    subjectName: s.subjectName,
    attempts: s.attempts,
    averageScore: Math.round((s.totalPct / s.attempts) * 100) / 100,
  }));

  res.json({
    totalAttempts,
    averageScore: Math.round(averageScore * 100) / 100,
    totalQuestionsAnswered,
    bestScore: bestScore !== null ? Math.round(bestScore * 100) / 100 : null,
    recentAttempts,
    subjectBreakdown,
  });
});

export default router;
