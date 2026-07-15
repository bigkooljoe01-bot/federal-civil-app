import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, examTypesTable, usersTable } from "@workspace/db";
import {
  CreateExamTypeBody,
  UpdateExamTypeBody,
  UpdateExamTypeParams,
  DeleteExamTypeParams,
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

// GET /exam-types
router.get("/exam-types", async (_req, res): Promise<void> => {
  const types = await db.select().from(examTypesTable).orderBy(examTypesTable.name);
  res.json(types.map((t) => ({ id: t.id, name: t.name, description: t.description, createdAt: t.createdAt })));
});

// POST /exam-types (admin)
router.post("/exam-types", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const parsed = CreateExamTypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [type] = await db.insert(examTypesTable).values(parsed.data).returning();
  res.status(201).json({ id: type.id, name: type.name, description: type.description, createdAt: type.createdAt });
});

// PATCH /exam-types/:examTypeId (admin)
router.patch("/exam-types/:examTypeId", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = UpdateExamTypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateExamTypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [type] = await db
    .update(examTypesTable)
    .set(parsed.data)
    .where(eq(examTypesTable.id, params.data.examTypeId))
    .returning();

  if (!type) {
    res.status(404).json({ error: "Exam type not found" });
    return;
  }

  res.json({ id: type.id, name: type.name, description: type.description, createdAt: type.createdAt });
});

// DELETE /exam-types/:examTypeId (admin)
router.delete("/exam-types/:examTypeId", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = DeleteExamTypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(examTypesTable).where(eq(examTypesTable.id, params.data.examTypeId)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Exam type not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
