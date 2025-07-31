import { Router } from "express";
import { adminLoginController, adminRegisterController } from "../controllers/auth.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
const router = Router();

router.post("/login", adminLoginController);
router.post("/register", adminRegisterController);
router.get('/get-user', verifyUser, (req,res)=>{
  
  
  res.status(200).json({
    success: true,
    admin: req.session.admin,
  })
})

export default router;
