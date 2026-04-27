import express from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import * as ctrl from "./writer.controller.js";

const router = express.Router();

router.get("/", asyncHandler(ctrl.getAllWriters));
router.post("/", asyncHandler(ctrl.createWriter));
router.get("/:id", asyncHandler(ctrl.getWriterById));
router.put("/:id", asyncHandler(ctrl.updateWriter));
router.delete("/:id", asyncHandler(ctrl.deleteWriter));

export default router;
