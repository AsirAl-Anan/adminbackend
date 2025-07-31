import { Router } from "express";
import { adminLoginController, adminRegisterController } from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", adminLoginController);
router.post("/register", adminLoginController);


export default router;
