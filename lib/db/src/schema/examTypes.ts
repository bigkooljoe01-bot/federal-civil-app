import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const examTypesTable = pgTable("exam_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExamTypeSchema = createInsertSchema(examTypesTable).omit({ id: true, createdAt: true });
export type InsertExamType = z.infer<typeof insertExamTypeSchema>;
export type ExamType = typeof examTypesTable.$inferSelect;
