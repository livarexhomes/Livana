import { Router, type IRouter } from "express";
import healthRouter from "./health";
import supabaseAdminRouter from "./supabase-admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(supabaseAdminRouter);

export default router;
