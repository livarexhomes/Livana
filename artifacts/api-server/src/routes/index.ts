import { Router, type IRouter } from "express";
import healthRouter from "./health";
import supabaseAdminRouter from "./supabase-admin";
import whatsappRouter from "./whatsapp";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(supabaseAdminRouter);
router.use(whatsappRouter);
router.use(authRouter);

export default router;
