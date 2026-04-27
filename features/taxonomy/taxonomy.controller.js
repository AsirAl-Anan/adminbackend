import TaxonomyNode from "../../models/taxonomyNode.model.js";
import Subject from "../../models/subject.model.js";
import UnifiedQuestion from "../../models/question.unified.model.js";
import { validateDynamicData } from "../../utils/validateDynamicData.util.js";
import { AppError } from "../../utils/errors.js";

// @desc  Get children of a parent node (or root nodes of a subject)
// @route GET /api/v1/taxonomy/subject/:subjectId?parentId=&nodeType=
export const getChildren = async (req, res) => {
    const { subjectId } = req.params;
    const { parentId, nodeType } = req.query;
    const filter = { subjectId, parentId: parentId || null };
    if (nodeType) filter.nodeType = nodeType;
    const nodes = await TaxonomyNode.find(filter).sort({ order: 1 });
    res.json({ success: true, data: nodes });
};

// @desc    Search taxonomy nodes by name (for autocomplete pickers)
// @route   GET /api/v1/taxonomy/subject/:subjectId/search
export const searchNodes = async (req, res) => {
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
        .select("name nodeType ancestors order depth")
        .sort({ order: 1 });

    res.json({ success: true, data: nodes });
};

// @desc  Get a single node with its immediate children
// @route GET /api/v1/taxonomy/:id
export const getNodeWithChildren = async (req, res) => {
    const node = await TaxonomyNode.findById(req.params.id);
    if (!node) throw new AppError("Node not found", 404);
    const children = await TaxonomyNode.find({ parentId: node._id }).sort({ order: 1 });
    res.json({ success: true, data: { ...node.toObject(), children } });
};

// @desc  Get ancestor chain (for breadcrumbs)
// @route GET /api/v1/taxonomy/:id/breadcrumbs
export const getBreadcrumbs = async (req, res) => {
    const node = await TaxonomyNode.findById(req.params.id).populate("ancestors", "name nodeType");
    if (!node) throw new AppError("Node not found", 404);
    res.json({ success: true, data: node.ancestors });
};

// @desc  Get ALL descendants of a node
// @route GET /api/v1/taxonomy/:id/descendants
export const getDescendants = async (req, res) => {
    const descendants = await TaxonomyNode.find({ ancestors: req.params.id }).sort({ depth: 1, order: 1 });
    res.json({ success: true, data: descendants });
};

// @desc  Create a new node
// @route POST /api/v1/taxonomy
export const createNode = async (req, res) => {
    const { subjectId, parentId, nodeType, subtype, name, data, aliases, importance, tags } = req.body;
    if (!subjectId || !nodeType) throw new AppError("subjectId and nodeType are required", 400);

    const subject = await Subject.findById(subjectId);
    if (!subject) throw new AppError("Subject not found", 404);

    const levelConfig = subject.taxonomyConfig.find(l => l.key === nodeType);
    if (!levelConfig) throw new AppError(`Invalid nodeType '${nodeType}' for this subject`, 400);

    // Validate dynamic data against schema
    if (levelConfig.dataSchema?.length) {
        const errors = validateDynamicData(data || {}, levelConfig.dataSchema);
        if (errors.length) return res.status(400).json({ success: false, message: "Data validation failed", errors });
    }

    let ancestors = [];
    if (parentId) {
        const parent = await TaxonomyNode.findById(parentId);
        if (!parent) throw new AppError("Parent node not found", 404);
        if (levelConfig.parentLevelKey && parent.nodeType !== levelConfig.parentLevelKey) {
            throw new AppError(`Parent must be of type '${levelConfig.parentLevelKey}'`, 400);
        }
        ancestors = [...parent.ancestors, parent._id];
    } else if (levelConfig.parentLevelKey) {
        throw new AppError(`Node type '${nodeType}' requires a parent of type '${levelConfig.parentLevelKey}'`, 400);
    }

    const siblingCount = await TaxonomyNode.countDocuments({ subjectId, parentId: parentId || null });

    const node = await TaxonomyNode.create({
        subjectId, parentId: parentId || null, nodeType, subtype: subtype || null,
        depth: levelConfig.depth, name, aliases, importance, tags, data: data || {}, ancestors, order: siblingCount,
    });

    res.status(201).json({ success: true, data: node });
};

// @desc  Update a node
// @route PUT /api/v1/taxonomy/:id
export const updateNode = async (req, res) => {
    const { name, data, importance, aliases, tags, order } = req.body;
    const node = await TaxonomyNode.findById(req.params.id);
    if (!node) throw new AppError("Node not found", 404);

    if (data) {
        const subject = await Subject.findById(node.subjectId);
        const levelConfig = subject?.taxonomyConfig.find(l => l.key === node.nodeType);
        if (levelConfig?.dataSchema?.length) {
            const errors = validateDynamicData(data, levelConfig.dataSchema);
            if (errors.length) return res.status(400).json({ success: false, message: "Data validation failed", errors });
        }
        node.data = data;
        node.markModified("data");
    }
    if (name !== undefined) node.name = name;
    if (importance !== undefined) node.importance = importance;
    if (aliases !== undefined) node.aliases = aliases;
    if (tags !== undefined) node.tags = tags;

    if (order !== undefined && order !== node.order) {
        if (order > node.order) {
            await TaxonomyNode.updateMany({ subjectId: node.subjectId, parentId: node.parentId, order: { $gt: node.order, $lte: order } }, { $inc: { order: -1 } });
        } else {
            await TaxonomyNode.updateMany({ subjectId: node.subjectId, parentId: node.parentId, order: { $gte: order, $lt: node.order } }, { $inc: { order: 1 } });
        }
        node.order = order;
    }

    await node.save();
    res.json({ success: true, data: node });
};

// @desc  Delete a node and all its descendants + their questions
// @route DELETE /api/v1/taxonomy/:id
export const deleteNode = async (req, res) => {
    const node = await TaxonomyNode.findById(req.params.id);
    if (!node) throw new AppError("Node not found", 404);

    // Find all descendant IDs (including self)
    const descendants = await TaxonomyNode.find({ ancestors: node._id }).select("_id");
    const allIds = [node._id, ...descendants.map(d => d._id)];

    await Promise.all([
        TaxonomyNode.deleteMany({ _id: { $in: allIds } }),
        UnifiedQuestion.deleteMany({ nodeId: { $in: allIds } }),
    ]);

    res.json({ success: true, message: `Deleted node and ${descendants.length} descendants`, deletedCount: allIds.length });
};
