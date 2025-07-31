import { Router } from "express";

const router = Router();

router.post("/login", (req, res) => {
const {email, password} = req.body
});
router.get("/getuser", (req, res) => {
if(req.session.username){
    res.send("user is "+req.session.username)
}else{
    res.send("no user")
}
});

export default router;
