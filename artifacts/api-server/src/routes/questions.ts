import { Router, type IRouter } from "express";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db, questionsTable, examTypesTable, subjectsTable, usersTable } from "@workspace/db";
import {
  ListQuestionsQueryParams,
  CreateQuestionBody,
  UpdateQuestionBody,
  UpdateQuestionParams,
  GetQuestionParams,
  DeleteQuestionParams,
  PublishQuestionParams,
  PublishQuestionBody,
  ListAvailableYearsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function requireAdmin(req: any, res: any): Promise<boolean> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.replitId, req.user.id));
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

function withNames(q: any, examTypeName: string | null, subjectName: string | null) {
  return {
    id: q.id,
    text: q.text,
    examTypeId: q.examTypeId,
    subjectId: q.subjectId,
    examTypeName,
    subjectName,
    year: q.year,
    topic: q.topic,
    explanation: q.explanation,
    options: (q.options as { letter: string; text: string }[]).map((o, i) => ({ id: i + 1, letter: o.letter, text: o.text })),
    correctLetter: q.correctLetter,
    published: q.published,
    createdAt: q.createdAt,
  };
}

// GET /questions/years
router.get("/questions/years", async (req, res): Promise<void> => {
  const params = ListAvailableYearsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [eq(questionsTable.published, true)];
  if (params.data.examTypeId) conditions.push(eq(questionsTable.examTypeId, params.data.examTypeId));
  if (params.data.subjectId) conditions.push(eq(questionsTable.subjectId, params.data.subjectId));

  const rows = await db
    .selectDistinct({ year: questionsTable.year })
    .from(questionsTable)
    .where(and(...conditions))
    .orderBy(questionsTable.year);

  res.json(rows.map((r) => r.year).sort((a, b) => b - a));
});

// GET /questions
router.get("/questions", async (req, res): Promise<void> => {
  const parsed = ListQuestionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { examTypeId, subjectId, year, topic, page, limit, published } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  if (examTypeId != null) conditions.push(eq(questionsTable.examTypeId, examTypeId));
  if (subjectId != null) conditions.push(eq(questionsTable.subjectId, subjectId));
  if (year != null) conditions.push(eq(questionsTable.year, year));
  if (topic) conditions.push(eq(questionsTable.topic, topic));
  if (published != null) conditions.push(eq(questionsTable.published, published));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .where(whereClause);

  const questions = await db
    .select({
      q: questionsTable,
      examTypeName: examTypesTable.name,
      subjectName: subjectsTable.name,
    })
    .from(questionsTable)
    .leftJoin(examTypesTable, eq(questionsTable.examTypeId, examTypesTable.id))
    .leftJoin(subjectsTable, eq(questionsTable.subjectId, subjectsTable.id))
    .where(whereClause)
    .orderBy(questionsTable.createdAt)
    .limit(limit)
    .offset(offset);

  res.json({
    questions: questions.map(({ q, examTypeName, subjectName }) =>
      withNames(q, examTypeName ?? null, subjectName ?? null)
    ),
    total: count ?? 0,
    page,
    limit,
  });
});

// POST /questions (admin)
router.post("/questions", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const parsed = CreateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { options, ...rest } = parsed.data;
  const [q] = await db.insert(questionsTable).values({ ...rest, options }).returning();

  const [examType] = await db.select().from(examTypesTable).where(eq(examTypesTable.id, q.examTypeId));
  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, q.subjectId));

  res.status(201).json(withNames(q, examType?.name ?? null, subject?.name ?? null));
});

// GET /questions/:questionId
router.get("/questions/:questionId", async (req, res): Promise<void> => {
  const params = GetQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({ q: questionsTable, examTypeName: examTypesTable.name, subjectName: subjectsTable.name })
    .from(questionsTable)
    .leftJoin(examTypesTable, eq(questionsTable.examTypeId, examTypesTable.id))
    .leftJoin(subjectsTable, eq(questionsTable.subjectId, subjectsTable.id))
    .where(eq(questionsTable.id, params.data.questionId));

  if (!rows[0]) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const { q, examTypeName, subjectName } = rows[0];
  res.json(withNames(q, examTypeName ?? null, subjectName ?? null));
});

// PATCH /questions/:questionId (admin)
router.patch("/questions/:questionId", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = UpdateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: any = { ...parsed.data, updatedAt: new Date() };

  const [q] = await db
    .update(questionsTable)
    .set(updateData)
    .where(eq(questionsTable.id, params.data.questionId))
    .returning();

  if (!q) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const [examType] = await db.select().from(examTypesTable).where(eq(examTypesTable.id, q.examTypeId));
  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, q.subjectId));

  res.json(withNames(q, examType?.name ?? null, subject?.name ?? null));
});

// DELETE /questions/:questionId (admin)
router.delete("/questions/:questionId", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = DeleteQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(questionsTable)
    .where(eq(questionsTable.id, params.data.questionId))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.sendStatus(204);
});

// PATCH /questions/:questionId/publish (admin)
router.patch("/questions/:questionId/publish", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = PublishQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = PublishQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [q] = await db
    .update(questionsTable)
    .set({ published: parsed.data.published, updatedAt: new Date() })
    .where(eq(questionsTable.id, params.data.questionId))
    .returning();

  if (!q) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const [examType] = await db.select().from(examTypesTable).where(eq(examTypesTable.id, q.examTypeId));
  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, q.subjectId));

  res.json(withNames(q, examType?.name ?? null, subject?.name ?? null));
});

export default router;
