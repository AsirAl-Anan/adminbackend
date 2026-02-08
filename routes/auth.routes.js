import { Router } from "express";
import { employeeLoginController, employeeRegisterController ,employeeGoogleController, employeeGoogleCallbackController, employeeLogoutController, employeeSecuredFingerprintController} from "../controllers/auth.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
const router = Router();

router.post("/login", employeeLoginController);
router.post("/register", employeeRegisterController);
router.post("/logout", employeeLogoutController);

router.get("/get-fp", (req,res)=>{
  if (!req.cookies.fp) {
    return res.status(200).json({
      success: false,
      message: "Fingerprint missing",
    });
  }
  res.status(200).json({
    success: true,
    fingerprint: req.cookies.fp,
  });
});
router.post('/set-fp', employeeSecuredFingerprintController)

router.get("/google", employeeGoogleController)
router.get("/google/callback", employeeGoogleCallbackController)

router.get('/get-user', verifyUser, (req,res)=>{
  res.status(200).json({
    success: true,
    employee: req.session.employee,
  })
})


export default router;
