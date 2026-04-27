import ContentTemplate from "../../models/contentTemplate.model.js";
import Subject from "../../models/subject.model.js";
import { AppError } from "../../utils/errors.js";

/**
 * GET /content-templates
 * List all content templates. Supports ?category=THEORY&status=ACTIVE&search=...
 */
export const getAllContentTemplates = async (req, res) => {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
        filter.$or = [
            { "label.en": { $regex: req.query.search, $options: "i" } },
            { "label.bn": { $regex: req.query.search, $options: "i" } },
            { templateKey: { $regex: req.query.search, $options: "i" } },
            { tags: { $regex: req.query.search, $options: "i" } },
        ];
    }
    const templates = await ContentTemplate.find(filter).sort({ category: 1, templateKey: 1 });
    res.json({ success: true, data: templates });
};

/**
 * GET /content-templates/:id
 * Get a single template by _id.
 */
export const getContentTemplateById = async (req, res) => {
    const template = await ContentTemplate.findById(req.params.id);
    if (!template) throw new AppError("Content Template not found", 404);
    res.json({ success: true, data: template });
};

/**
 * GET /content-templates/key/:key
 * Get a single template by templateKey slug.
 */
export const getContentTemplateByKey = async (req, res) => {
    const template = await ContentTemplate.findOne({ templateKey: req.params.key });
    if (!template) throw new AppError("Content Template not found", 404);
    res.json({ success: true, data: template });
};

/**
 * POST /content-templates
 * Create a new content template.
 */
export const createContentTemplate = async (req, res) => {
    const template = await ContentTemplate.create(req.body);
    res.status(201).json({ success: true, data: template });
};

/**
 * PUT /content-templates/:id
 * Update an existing pattern.
 */
export const updateContentTemplate = async (req, res) => {
    const template = await ContentTemplate.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    if (!template) throw new AppError("Content Template not found", 404);
    res.json({ success: true, data: template });
};

/**
 * POST /content-templates/:id/duplicate
 * Clone an existing template with a new key.
 */
export const duplicateContentTemplate = async (req, res) => {
    const source = await ContentTemplate.findById(req.params.id);
    if (!source) throw new AppError("Content Template not found", 404);

    const obj = source.toObject();
    delete obj._id;
    delete obj.createdAt;
    delete obj.updatedAt;
    delete obj.__v;

    // Generate a unique key
    const newKey = req.body.templateKey || `${obj.templateKey}_copy`;
    const existing = await ContentTemplate.findOne({ templateKey: newKey });
    if (existing) throw new AppError(`Template key '${newKey}' already exists`, 409);

    obj.templateKey = newKey;
    obj.label = req.body.label || {
        en: `${obj.label.en} (Copy)`,
        bn: `${obj.label.bn} (কপি)`,
    };
    obj.status = "DRAFT";

    const clone = await ContentTemplate.create(obj);
    res.status(201).json({ success: true, data: clone });
};

/**
 * GET /content-templates/:id/usage
 * Find which subjects reference this template.
 */
export const getContentTemplateUsage = async (req, res) => {
    const subjects = await Subject.find({ contentTemplates: req.params.id })
        .select("name subjectCode level group");
    res.json({ success: true, data: subjects });
};

/**
 * DELETE /content-templates/:id
 * Delete a template. Warns if subjects still reference it.
 */
export const deleteContentTemplate = async (req, res) => {
    const usageCount = await Subject.countDocuments({ contentTemplates: req.params.id });
    if (usageCount > 0 && !req.query.force) {
        throw new AppError(
            `Template is used by ${usageCount} subject(s). Pass ?force=true to delete anyway.`,
            409
        );
    }

    // Remove from all subjects that reference it
    if (usageCount > 0) {
        await Subject.updateMany(
            { contentTemplates: req.params.id },
            { $pull: { contentTemplates: req.params.id } }
        );
    }

    const result = await ContentTemplate.findByIdAndDelete(req.params.id);
    if (!result) throw new AppError("Content Template not found", 404);
    res.json({ success: true, message: "Content Template deleted" });
};
