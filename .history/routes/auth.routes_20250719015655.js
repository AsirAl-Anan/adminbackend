import { Router } from "express";

const router = Router();

router.post("/getuser", (req, res) => {
  req.session.username = "nafisa";

  res.send(req.session.username);
});
router.post("/logout", (req, res) => {

});

export default router;
