import { Router } from "express";

const router = Router();

router.post("/user", (req, res) => {
  req.session.username = "nafisa";

  res.send(req.session.username);
});
router.post("/getuser", (req, res) => {
ii
});

export default router;
