import express from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import * as ctrl from "./taxonomy.controller.js";

const router = express.Router();

router.get("/subject/:subjectId", asyncHandler(ctrl.getChildren));
router.get("/subject/:subjectId/search", asyncHandler(ctrl.searchNodes));
router.get("/:id/breadcrumbs", asyncHandler(ctrl.getBreadcrumbs));
router.get("/:id/descendants", asyncHandler(ctrl.getDescendants));
router.get("/:id", asyncHandler(ctrl.getNodeWithChildren));
router.post("/", asyncHandler(ctrl.createNode));
router.put("/:id", asyncHandler(ctrl.updateNode));
router.delete("/:id", asyncHandler(ctrl.deleteNode));

export default router;
