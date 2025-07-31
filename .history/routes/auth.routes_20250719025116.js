import { Router } from "express";
import { adminLoginController, adminRegisterController } from "../controllers/auth.controller.js";
const router = Router();

router.post("/login", adminLoginController);
router.get("/getuser", (req, res) => {
if(req.session.username){
    res.send("user is "+req.session.username)
}else{
    res.send("no user")
}
});

export default router;
