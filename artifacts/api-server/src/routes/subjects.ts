import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, subjectsTable, usersTable } from "@workspace/db";
import {
  CreateSubjectBody,
  UpdateSubjectBody,
  UpdateSubjectParams,
  DeleteSubjectParams,
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

// GET /subjects
router.get("/subjects", async (_req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.name);
  res.json(subjects.map((s) => ({ id: s.id, name: s.name, description: s.description, createdAt: s.createdAt })));
});

// POST /subjects (admin)
router.post("/subjects", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [subject] = await db.insert(subjectsTable).values(parsed.data).returning();
  res.status(201).json({ id: subject.id, name: subject.name, description: subject.description, createdAt: subject.createdAt });
});

// PATCH /subjects/:subjectId (admin)
router.patch("/subjects/:subjectId", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = UpdateSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [subject] = await db
    .update(subjectsTable)
    .set(parsed.data)
    .where(eq(subjectsTable.id, params.data.subjectId))
    .returning();

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  res.json({ id: subject.id, name: subject.name, description: subject.description, createdAt: subject.createdAt });
});

// DELETE /subjects/:subjectId (admin)
router.delete("/subjects/:subjectId", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = DeleteSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(subjectsTable).where(eq(subjectsTable.id, params.data.subjectId)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
