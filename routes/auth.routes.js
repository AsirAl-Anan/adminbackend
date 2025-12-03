import { Router } from "express";
import { adminLoginController, adminRegisterController ,adminGoogleController, adminGoogleCallbackController} from "../controllers/auth.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
const router = Router();

router.post("/login", adminLoginController);
router.post("/register", adminRegisterController);
router.get("/google", adminGoogleController)
router.get("/google/callback", adminGoogleCallbackController)


router.get('/get-user', verifyUser, (req,res)=>{
  
  
  res.status(200).json({
    success: true,
    admin: req.session.admin,
  })
})

export default router;
