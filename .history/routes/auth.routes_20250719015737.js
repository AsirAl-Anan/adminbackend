import { Router } from "express";

const router = Router();

router.post("/user", (req, res) => {
  req.session.username = "nafisa";

  res.send(req.session.username);
});
router.post("/getuser", (req, res) => {
if(req.session.username){
    res.send("user is "+req.session.username)
}else{
    res.send("no user")
}
});

export default router;
