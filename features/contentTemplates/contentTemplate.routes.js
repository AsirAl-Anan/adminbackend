import express from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import * as ctrl from "./contentTemplate.controller.js";

const router = express.Router();

router.get("/", asyncHandler(ctrl.getAllContentTemplates));
router.post("/", asyncHandler(ctrl.createContentTemplate));

router.get("/:id", asyncHandler(ctrl.getContentTemplateById));
router.put("/:id", asyncHandler(ctrl.updateContentTemplate));
router.delete("/:id", asyncHandler(ctrl.deleteContentTemplate));

router.get("/key/:key", asyncHandler(ctrl.getContentTemplateByKey));
router.post("/:id/duplicate", asyncHandler(ctrl.duplicateContentTemplate));
router.get("/:id/usage", asyncHandler(ctrl.getContentTemplateUsage));

export default router;
