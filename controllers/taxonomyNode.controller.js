import TaxonomyNode from "../models/taxonomyNode.model.js";
import Subject from "../models/subject.model.js";
import { validateDynamicData } from "../utils/validateDynamicData.util.js";

// @desc    Get all root nodes for a subject, or children of a specific parent
// @route   GET /api/taxonomy/subject/:subjectId
// @access  Private/Admin
export const getChildren = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const { parentId, nodeType } = req.query;

        const filter = {
            subjectId,
            parentId: parentId || null,
        };

        if (nodeType) {
            filter.nodeType = nodeType;
        }

        const nodes = await TaxonomyNode.find(filter).sort({ order: 1 });

        res.status(200).json({
            success: true,
            data: nodes,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get a single node and its immediate children
// @route   GET /api/taxonomy/:id
// @access  Private/Admin
export const getNodeWithChildren = async (req, res) => {
    try {
        const node = await TaxonomyNode.findById(req.params.id);
        if (!node) {
            return res.status(404).json({ success: false, message: "Node not found" });
        }

        const children = await TaxonomyNode.find({ parentId: node._id }).sort({ order: 1 });

        res.status(200).json({
            success: true,
            data: {
                ...node.toObject(),
                children,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Search taxonomy nodes by name (for autocomplete pickers)
// @route   GET /api/taxonomy/subject/:subjectId/search
// @access  Private/Admin
export const searchNodes = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const { q, nodeType, limit = 10 } = req.query;

        const filter = { subjectId };
        if (nodeType) filter.nodeType = nodeType;

        if (q) {
            filter.$or = [
                { "name.en": { $regex: q, $options: "i" } },
                { "name.bn": { $regex: q, $options: "i" } },
            ];
        }

        const nodes = await TaxonomyNode.find(filter)
            .limit(parseInt(limit))
            .select("name nodeType ancestors order")
            .sort({ order: 1 });

        res.status(200).json({
            success: true,
            data: nodes,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get the full ancestor path (breadcrumbs) for a node
// @route   GET /api/taxonomy/:id/breadcrumbs
// @access  Private/Admin
export const getBreadcrumbs = async (req, res) => {
    try {
        const node = await TaxonomyNode.findById(req.params.id).populate("ancestors", "name nodeType");
        if (!node) {
            return res.status(404).json({ success: false, message: "Node not found" });
        }

        res.status(200).json({
            success: true,
            data: node.ancestors,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a new taxonomy node
// @route   POST /api/taxonomy
// @access  Private/Admin
export const createNode = async (req, res) => {
    try {
        const { subjectId, parentId, nodeType, subtype, name, data, aliases, importance, tags } = req.body;

        if (!subjectId || !nodeType) {
            return res.status(400).json({ success: false, message: "subjectId and nodeType are required" });
        }

        // 1. Get the subject and its taxonomy config
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ success: false, message: "Subject not found" });
        }

        const levelConfig = subject.taxonomyConfig.find((l) => l.key === nodeType);
        if (!levelConfig) {
            return res.status(400).json({ success: false, message: `Invalid nodeType '${nodeType}' for this subject` });
        }

        // 2. Validate the dynamic data against the schema for this nodeType
        if (levelConfig.dataSchema && levelConfig.dataSchema.length > 0) {
            const validationErrors = validateDynamicData(data || {}, levelConfig.dataSchema);
            if (validationErrors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Data validation failed",
                    errors: validationErrors,
                });
            }
        }

        // 3. Compute ancestors and depth
        let ancestors = [];
        let depth = levelConfig.depth; // Base depth from config

        if (parentId) {
            const parent = await TaxonomyNode.findById(parentId);
            if (!parent) {
                return res.status(404).json({ success: false, message: "Parent node not found" });
            }

            // Verify parent type matches what's configured
            if (levelConfig.parentLevelKey && parent.nodeType !== levelConfig.parentLevelKey) {
                return res.status(400).json({
                    success: false,
                    message: `Parent node must be of type '${levelConfig.parentLevelKey}'`,
                });
            }

            ancestors = [...parent.ancestors, parent._id];
        } else {
            // If no parentId, ensure this level is configured as a root level
            if (levelConfig.parentLevelKey) {
                return res.status(400).json({
                    success: false,
                    message: `Node type '${nodeType}' requires a parent of type '${levelConfig.parentLevelKey}'`,
                });
            }
        }

        // 4. Calculate order (append to end of siblings)
        const siblingCount = await TaxonomyNode.countDocuments({
            subjectId,
            parentId: parentId || null,
        });

        // 5. Create the node
        const node = await TaxonomyNode.create({
            subjectId,
            parentId: parentId || null,
            nodeType,
            subtype: subtype || null,
            depth,
            name,
            aliases: aliases || { english: [], bangla: [], banglish: [] },
            importance: importance || "MEDIUM",
            tags: tags || [],
            data: data || {},
            ancestors,
            order: siblingCount,
        });

        res.status(201).json({
            success: true,
            data: node,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a taxonomy node
// @route   PUT /api/taxonomy/:id
// @access  Private/Admin
export const updateNode = async (req, res) => {
    try {
        const { name, data, importance, aliases, tags, order } = req.body;

        const node = await TaxonomyNode.findById(req.params.id);
        if (!node) {
            return res.status(404).json({ success: false, message: "Node not found" });
        }

        // Validate data payload if provided
        if (data) {
            const subject = await Subject.findById(node.subjectId);
            const levelConfig = subject.taxonomyConfig.find((l) => l.key === node.nodeType);

            if (levelConfig && levelConfig.dataSchema) {
                const validationErrors = validateDynamicData(data, levelConfig.dataSchema);
                if (validationErrors.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Data validation failed",
                        errors: validationErrors,
                    });
                }
            }
            node.data = data;
        }

        // Update standard fields
        if (name !== undefined) node.name = name;
        if (importance !== undefined) node.importance = importance;
        if (aliases !== undefined) node.aliases = aliases;
        if (tags !== undefined) node.tags = tags;

        // Handle reordering among siblings
        if (order !== undefined && order !== node.order) {
            // Pull other siblings down or push them up
            if (order > node.order) {
                await TaxonomyNode.updateMany(
                    { subjectId: node.subjectId, parentId: node.parentId, order: { $gt: node.order, $lte: order } },
                    { $inc: { order: -1 } }
                );
            } else {
                await TaxonomyNode.updateMany(
                    { subjectId: node.subjectId, parentId: node.parentId, order: { $gte: order, $lt: node.order } },
                    { $inc: { order: 1 } }
                );
            }
            node.order = order;
        }

        await node.save();

        res.status(200).json({
            success: true,
            data: node,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a taxonomy node and all its descendants
// @route   DELETE /api/taxonomy/:id
// @access  Private/Admin
export const deleteNode = async (req, res) => {
    try {
        const node = await TaxonomyNode.findById(req.params.id);
        if (!node) {
            return res.status(404).json({ success: false, message: "Node not found" });
        }

        // Delete the node AND all nodes that list this node as an ancestor
        const deleteResult = await TaxonomyNode.deleteMany({
            $or: [
                { _id: node._id },
                { ancestors: node._id }
            ]
        });

        res.status(200).json({
            success: true,
            message: "Node and all related descendants deleted successfully",
            deletedCount: deleteResult.deletedCount,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
