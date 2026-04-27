import express from "express";
import * as taxonomyNodeController from "../controllers/taxonomyNode.controller.js";

const router = express.Router();

// Note: Ensure admin authentication middleware is added based on your app's standard

router.get("/subject/:subjectId", taxonomyNodeController.getChildren);
router.get("/subject/:subjectId/search", taxonomyNodeController.searchNodes);
router.get("/:id", taxonomyNodeController.getNodeWithChildren);
router.get("/:id/breadcrumbs", taxonomyNodeController.getBreadcrumbs);

router.post("/", taxonomyNodeController.createNode);
router.put("/:id", taxonomyNodeController.updateNode);
router.delete("/:id", taxonomyNodeController.deleteNode);

export default router;
