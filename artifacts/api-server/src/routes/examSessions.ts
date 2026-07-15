import { Router, type IRouter } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  db, usersTable, questionsTable, examSessionsTable, sessionQuestionsTable,
  examTypesTable, subjectsTable,
} from "@workspace/db";
import {
  StartExamSessionBody,
  GetExamSessionParams,
  SaveAnswerParams,
  SaveAnswerBody,
  FlagQuestionParams,
  FlagQuestionBody,
  SubmitExamSessionParams,
  GetExamReviewParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function formatQuestion(q: any) {
  return {
    id: q.id,
    text: q.text,
    examTypeId: q.examTypeId,
    subjectId: q.subjectId,
    examTypeName: null as string | null,
    subjectName: null as string | null,
    year: q.year,
    topic: q.topic,
    explanation: q.explanation,
    options: (q.options as { letter: string; text: string }[]).map((o, i) => ({ id: i + 1, letter: o.letter, text: o.text })),
    correctLetter: q.correctLetter,
    published: q.published,
    createdAt: q.createdAt,
  };
}

function formatSessionQuestion(sq: any, question: any) {
  return {
    id: sq.id,
    questionId: sq.questionId,
    position: sq.position,
    selectedLetter: sq.selectedLetter,
    flagged: sq.flagged,
    question: formatQuestion(question),
  };
}

async function buildSessionResponse(session: any) {
  const sessionQs = await db
    .select()
    .from(sessionQuestionsTable)
    .where(eq(sessionQuestionsTable.sessionId, session.id))
    .orderBy(sessionQuestionsTable.position);

  const [examType] = await db.select().from(examTypesTable).where(eq(examTypesTable.id, session.examTypeId));
  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, session.subjectId));

  const questionIds = sessionQs.map((sq) => sq.questionId);
  const questions = questionIds.length > 0
    ? await db.select().from(questionsTable).where(inArray(questionsTable.id, questionIds))
    : [];

  // Use a map for O(1) lookup
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  return {
    id: session.id,
    userId: session.userId,
    examTypeId: session.examTypeId,
    subjectId: session.subjectId,
    examTypeName: examType?.name ?? null,
    subjectName: subject?.name ?? null,
    year: session.year,
    status: session.status,
    startedAt: session.startedAt,
    submittedAt: session.submittedAt,
    durationMinutes: session.durationMinutes,
    questions: sessionQs.map((sq) => {
      const q = questionMap.get(sq.questionId);
      if (!q) return null;
      return formatSessionQuestion(sq, q);
    }).filter(Boolean),
  };
}

// POST /exam-sessions
router.post("/exam-sessions", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const parsed = StartExamSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.replitId, req.user!.id));
  if (!dbUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { examTypeId, subjectId, year, durationMinutes } = parsed.data;

  // Get published questions for this exam/subject/year
  const questions = await db
    .select()
    .from(questionsTable)
    .where(and(
      eq(questionsTable.examTypeId, examTypeId),
      eq(questionsTable.subjectId, subjectId),
      eq(questionsTable.year, year),
      eq(questionsTable.published, true),
    ));

  if (questions.length === 0) {
    res.status(404).json({ error: "No published questions found for this selection" });
    return;
  }

  // Shuffle questions
  const shuffled = [...questions].sort(() => Math.random() - 0.5);

  const [session] = await db.insert(examSessionsTable).values({
    userId: dbUser.id,
    examTypeId,
    subjectId,
    year,
    durationMinutes: durationMinutes ?? 60,
    status: "in_progress",
  }).returning();

  // Insert session questions
  await db.insert(sessionQuestionsTable).values(
    shuffled.map((q, i) => ({
      sessionId: session.id,
      questionId: q.id,
      position: i + 1,
      selectedLetter: null,
      flagged: false,
    }))
  );

  const response = await buildSessionResponse(session);
  res.status(201).json(response);
});

// GET /exam-sessions/active
router.get("/exam-sessions/active", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.replitId, req.user!.id));
  if (!dbUser) {
    res.json({ session: null });
    return;
  }

  const [session] = await db
    .select()
    .from(examSessionsTable)
    .where(and(
      eq(examSessionsTable.userId, dbUser.id),
      eq(examSessionsTable.status, "in_progress"),
    ))
    .orderBy(desc(examSessionsTable.startedAt))
    .limit(1);

  if (!session) {
    res.json({ session: null });
    return;
  }

  const response = await buildSessionResponse(session);
  res.json({ session: response });
});

// GET /exam-sessions/:sessionId
router.get("/exam-sessions/:sessionId", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const params = GetExamSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db.select().from(examSessionsTable).where(eq(examSessionsTable.id, params.data.sessionId));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const response = await buildSessionResponse(session);
  res.json(response);
});

// PATCH /exam-sessions/:sessionId/answer
router.patch("/exam-sessions/:sessionId/answer", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const params = SaveAnswerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SaveAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db.select().from(examSessionsTable).where(eq(examSessionsTable.id, params.data.sessionId));
  if (!session || session.status !== "in_progress") {
    res.status(400).json({ error: "Session not found or already submitted" });
    return;
  }

  const [sq] = await db
    .update(sessionQuestionsTable)
    .set({ selectedLetter: parsed.data.selectedLetter })
    .where(and(
      eq(sessionQuestionsTable.sessionId, params.data.sessionId),
      eq(sessionQuestionsTable.questionId, parsed.data.questionId),
    ))
    .returning();

  if (!sq) {
    res.status(404).json({ error: "Session question not found" });
    return;
  }

  const [q] = await db.select().from(questionsTable).where(eq(questionsTable.id, sq.questionId));
  res.json(formatSessionQuestion(sq, q));
});

// PATCH /exam-sessions/:sessionId/flag
router.patch("/exam-sessions/:sessionId/flag", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const params = FlagQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = FlagQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [sq] = await db
    .update(sessionQuestionsTable)
    .set({ flagged: parsed.data.flagged })
    .where(and(
      eq(sessionQuestionsTable.sessionId, params.data.sessionId),
      eq(sessionQuestionsTable.questionId, parsed.data.questionId),
    ))
    .returning();

  if (!sq) {
    res.status(404).json({ error: "Session question not found" });
    return;
  }

  const [q] = await db.select().from(questionsTable).where(eq(questionsTable.id, sq.questionId));
  res.json(formatSessionQuestion(sq, q));
});

// POST /exam-sessions/:sessionId/submit
router.post("/exam-sessions/:sessionId/submit", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const params = SubmitExamSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db.select().from(examSessionsTable).where(eq(examSessionsTable.id, params.data.sessionId));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.status === "submitted") {
    // Return existing result
    const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
    const [examType] = await db.select().from(examTypesTable).where(eq(examTypesTable.id, session.examTypeId));
    const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, session.subjectId));

    res.json({
      sessionId: session.id,
      userId: session.userId,
      userName: dbUser?.username ?? null,
      examTypeName: examType?.name ?? null,
      subjectName: subject?.name ?? null,
      year: session.year,
      totalQuestions: session.totalQuestions ?? 0,
      correct: session.correct ?? 0,
      wrong: session.wrong ?? 0,
      unanswered: session.unanswered ?? 0,
      score: parseFloat(session.score ?? "0"),
      percentage: parseFloat(session.percentage ?? "0"),
      passed: session.passed ?? false,
      submittedAt: session.submittedAt,
    });
  }

  // Calculate results
  const sessionQs = await db
    .select()
    .from(sessionQuestionsTable)
    .where(eq(sessionQuestionsTable.sessionId, session.id));

  const questionIds = sessionQs.map((sq) => sq.questionId);
  let questions: any[] = [];
  if (questionIds.length > 0) {
    // Fetch in batches if needed
    questions = await db.select().from(questionsTable).where(
      questionIds.length === 1
        ? eq(questionsTable.id, questionIds[0])
        : inArray(questionsTable.id, questionIds)
    );
  }
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  for (const sq of sessionQs) {
    const q = questionMap.get(sq.questionId);
    if (!sq.selectedLetter) {
      unanswered++;
    } else if (q && sq.selectedLetter === q.correctLetter) {
      correct++;
    } else {
      wrong++;
    }
  }

  const totalQuestions = sessionQs.length;
  const score = correct;
  const percentage = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;
  const passed = percentage >= 50;
  const submittedAt = new Date();

  await db
    .update(examSessionsTable)
    .set({
      status: "submitted",
      submittedAt,
      totalQuestions,
      correct,
      wrong,
      unanswered,
      score: score.toString(),
      percentage: percentage.toFixed(2),
      passed,
    })
    .where(eq(examSessionsTable.id, session.id));

  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  const [examType] = await db.select().from(examTypesTable).where(eq(examTypesTable.id, session.examTypeId));
  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, session.subjectId));

  res.json({
    sessionId: session.id,
    userId: session.userId,
    userName: dbUser?.username ?? null,
    examTypeName: examType?.name ?? null,
    subjectName: subject?.name ?? null,
    year: session.year,
    totalQuestions,
    correct,
    wrong,
    unanswered,
    score,
    percentage: Math.round(percentage * 100) / 100,
    passed,
    submittedAt: submittedAt.toISOString(),
  });
});

// GET /exam-sessions/:sessionId/review
router.get("/exam-sessions/:sessionId/review", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const params = GetExamReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db.select().from(examSessionsTable).where(eq(examSessionsTable.id, params.data.sessionId));
  if (!session || session.status !== "submitted") {
    res.status(404).json({ error: "Submitted session not found" });
    return;
  }

  const sessionQs = await db
    .select()
    .from(sessionQuestionsTable)
    .where(eq(sessionQuestionsTable.sessionId, session.id))
    .orderBy(sessionQuestionsTable.position);

  const questionIds = sessionQs.map((sq) => sq.questionId);
  let questions: any[] = [];
  if (questionIds.length > 0) {
    questions = await db.select().from(questionsTable).where(
      questionIds.length === 1
        ? eq(questionsTable.id, questionIds[0])
        : inArray(questionsTable.id, questionIds)
    );
  }
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  const [examType] = await db.select().from(examTypesTable).where(eq(examTypesTable.id, session.examTypeId));
  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, session.subjectId));

  const result = {
    sessionId: session.id,
    userId: session.userId,
    userName: dbUser?.username ?? null,
    examTypeName: examType?.name ?? null,
    subjectName: subject?.name ?? null,
    year: session.year,
    totalQuestions: session.totalQuestions ?? 0,
    correct: session.correct ?? 0,
    wrong: session.wrong ?? 0,
    unanswered: session.unanswered ?? 0,
    score: parseFloat(session.score ?? "0"),
    percentage: parseFloat(session.percentage ?? "0"),
    passed: session.passed ?? false,
    submittedAt: session.submittedAt,
  };

  const reviewQuestions = sessionQs.map((sq) => {
    const q = questionMap.get(sq.questionId);
    const isCorrect = !!sq.selectedLetter && q && sq.selectedLetter === q.correctLetter;
    return {
      position: sq.position,
      questionId: sq.questionId,
      questionText: q?.text ?? "",
      options: (q?.options as { letter: string; text: string }[] ?? []).map((o, i) => ({ id: i + 1, letter: o.letter, text: o.text })),
      selectedLetter: sq.selectedLetter,
      correctLetter: q?.correctLetter ?? "",
      isCorrect: !!isCorrect,
      explanation: q?.explanation ?? null,
      flagged: sq.flagged,
    };
  });

  res.json({ sessionId: session.id, result, questions: reviewQuestions });
});

export default router;
