import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { examTypesTable } from "./examTypes";
import { subjectsTable } from "./subjects";

export const examSessionsTable = pgTable("exam_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  examTypeId: integer("exam_type_id").notNull().references(() => examTypesTable.id),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id),
  year: integer("year").notNull(),
  status: text("status").notNull().default("in_progress"), // "in_progress" | "submitted"
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  // Results stored after submission
  totalQuestions: integer("total_questions"),
  correct: integer("correct"),
  wrong: integer("wrong"),
  unanswered: integer("unanswered"),
  score: text("score"), // stored as string for decimal precision
  percentage: text("percentage"),
  passed: boolean("passed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionQuestionsTable = pgTable("session_questions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => examSessionsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull(),
  position: integer("position").notNull(),
  selectedLetter: text("selected_letter"),
  flagged: boolean("flagged").notNull().default(false),
});

export const insertExamSessionSchema = createInsertSchema(examSessionsTable).omit({ id: true, createdAt: true, startedAt: true });
export type InsertExamSession = z.infer<typeof insertExamSessionSchema>;
export type ExamSession = typeof examSessionsTable.$inferSelect;
export type SessionQuestion = typeof sessionQuestionsTable.$inferSelect;
