import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";
import { examTypesTable } from "./examTypes";

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  examTypeId: integer("exam_type_id").notNull().references(() => examTypesTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  topic: text("topic"),
  explanation: text("explanation"),
  // options stored as JSON: [{letter: "A", text: "..."}, ...]
  options: jsonb("options").notNull().$type<{ letter: string; text: string }[]>(),
  correctLetter: text("correct_letter").notNull(),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
