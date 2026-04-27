import express from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import * as ctrl from "./subject.controller.js";

const router = express.Router();

// Subject CRUD
router.get("/", asyncHandler(ctrl.getAllSubjects));
router.post("/", asyncHandler(ctrl.createSubject));
router.get("/:id", asyncHandler(ctrl.getSubjectById));
router.put("/:id", asyncHandler(ctrl.updateSubject));
router.delete("/:id", asyncHandler(ctrl.deleteSubject));

// TaxonomyConfig management
router.put("/:id/taxonomy-config", asyncHandler(ctrl.updateTaxonomyConfig));

// Question template management (attach/detach by ID)
router.post("/:id/templates", asyncHandler(ctrl.addTemplate));
router.delete("/:id/templates/:templateId", asyncHandler(ctrl.removeTemplate));

// Content template management (attach/detach by ID)
router.post("/:id/content-templates", asyncHandler(ctrl.addContentTemplate));
router.delete("/:id/content-templates/:templateId", asyncHandler(ctrl.removeContentTemplate));

export default router;
