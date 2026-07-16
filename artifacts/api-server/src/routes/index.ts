import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import localAuthRouter from "./local-auth";
import usersRouter from "./users";
import subjectsRouter from "./subjects";
import examTypesRouter from "./examTypes";
import questionsRouter from "./questions";
import examSessionsRouter from "./examSessions";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(localAuthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(subjectsRouter);
router.use(examTypesRouter);
router.use(questionsRouter);
router.use(examSessionsRouter);
router.use(statsRouter);

export default router;
