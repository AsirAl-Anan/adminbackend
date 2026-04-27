import express from "express";
import {
    employeeLoginController,
    employeeRegisterController,
    employeeLogoutController,
    employeeGoogleController,
    employeeGoogleCallbackController,
    employeeSecuredFingerprintController,
} from "../../controllers/auth.controller.js";

import { verifyUser } from "./auth.middleware.js";

const router = express.Router();

// Session-based auth
router.get("/get-fp", (req, res) => {
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
router.post("/fingerprint", employeeSecuredFingerprintController);
router.post("/set-fp", employeeSecuredFingerprintController);
router.post("/login", employeeLoginController);
router.post("/register", employeeRegisterController);
router.post("/logout", employeeLogoutController);
router.get("/get-user", verifyUser, (req, res) => {
    res.status(200).json({
        success: true,
        employee: req.session.employee,
    });
});


// Google OAuth
router.get("/google", employeeGoogleController);
router.get("/google/callback", employeeGoogleCallbackController);

export default router;
