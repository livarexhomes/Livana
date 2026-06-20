import { Router, type IRouter } from "express";
import healthRouter from "./health";
import emailRouter from "./email";
import extraRouter from "./extraRoutes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(emailRouter);
router.use(extraRouter);

export default router;
