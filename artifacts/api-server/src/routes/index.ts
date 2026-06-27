import { Router, type IRouter } from "express";
import healthRouter from "./health";
import supabaseAdminRouter from "./supabase-admin";
import whatsappRouter from "./whatsapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(supabaseAdminRouter);
router.use(whatsappRouter);

export default router;
