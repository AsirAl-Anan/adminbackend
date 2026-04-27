import express from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import * as ctrl from "./template.controller.js";

const router = express.Router();

router.get("/", asyncHandler(ctrl.getAllTemplates));
router.post("/", asyncHandler(ctrl.createTemplate));
// Specific routes BEFORE /:id to avoid param capture
router.get("/key/:key", asyncHandler(ctrl.getTemplateByKey));
router.get("/:id/usage", asyncHandler(ctrl.getTemplateUsage));
router.get("/:id/schema-preview", asyncHandler(ctrl.getTemplateSchemaPreview));
router.get("/:id", asyncHandler(ctrl.getTemplateById));
router.put("/:id", asyncHandler(ctrl.updateTemplate));
router.post("/:id/duplicate", asyncHandler(ctrl.duplicateTemplate));
router.delete("/:id", asyncHandler(ctrl.deleteTemplate));

export default router;
