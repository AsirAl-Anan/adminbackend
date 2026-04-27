import QuestionTemplate from "../../models/questionTemplate.model.js";
import Subject from "../../models/subject.model.js";
import { AppError } from "../../utils/errors.js";
import { validateFieldDefinitions } from "../../utils/validateFieldDefinitions.util.js";

/**
 * GET /templates
 * List all templates. Supports ?family=CQ&status=ACTIVE&search=...
 */
export const getAllTemplates = async (req, res) => {
    const filter = {};
    if (req.query.family) filter.family = req.query.family;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
        filter.$or = [
            { "label.en": { $regex: req.query.search, $options: "i" } },
            { "label.bn": { $regex: req.query.search, $options: "i" } },
            { templateKey: { $regex: req.query.search, $options: "i" } },
            { tags: { $regex: req.query.search, $options: "i" } },
        ];
    }
    const templates = await QuestionTemplate.find(filter).sort({ family: 1, templateKey: 1 });
    res.json({ success: true, data: templates });
};

/**
 * GET /templates/:id
 * Get a single template by _id.
 */
export const getTemplateById = async (req, res) => {
    const template = await QuestionTemplate.findById(req.params.id);
    if (!template) throw new AppError("Template not found", 404);
    res.json({ success: true, data: template });
};

/**
 * GET /templates/key/:key
 * Get a single template by templateKey slug.
 */
export const getTemplateByKey = async (req, res) => {
    const template = await QuestionTemplate.findOne({ templateKey: req.params.key });
    if (!template) throw new AppError("Template not found", 404);
    res.json({ success: true, data: template });
};

/**
 * POST /templates
 * Create a new question template.
 */
export const createTemplate = async (req, res) => {
    // Validate field definitions across all sections
    const allSections = req.body.sections || [];
    for (const section of allSections) {
        const fieldErrors = validateFieldDefinitions(section.fields || []);
        if (fieldErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid field definitions in section '${section.sectionKey || "CUSTOM"}'`,
                errors: fieldErrors,
            });
        }
    }

    const template = await QuestionTemplate.create(req.body);
    res.status(201).json({ success: true, data: template });
};

/**
 * PUT /templates/:id
 * Update an existing template.
 */
export const updateTemplate = async (req, res) => {
    // Validate field definitions across all sections
    const allSections = req.body.sections || [];
    for (const section of allSections) {
        const fieldErrors = validateFieldDefinitions(section.fields || []);
        if (fieldErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid field definitions in section '${section.sectionKey || "CUSTOM"}'`,
                errors: fieldErrors,
            });
        }
    }

    const template = await QuestionTemplate.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    if (!template) throw new AppError("Template not found", 404);
    res.json({ success: true, data: template });
};

/**
 * POST /templates/:id/duplicate
 * Clone an existing template with a new key.
 */
export const duplicateTemplate = async (req, res) => {
    const source = await QuestionTemplate.findById(req.params.id);
    if (!source) throw new AppError("Template not found", 404);

    const obj = source.toObject();
    delete obj._id;
    delete obj.createdAt;
    delete obj.updatedAt;
    delete obj.__v;

    // Generate a unique key
    const newKey = req.body.templateKey || `${obj.templateKey}_copy`;
    const existing = await QuestionTemplate.findOne({ templateKey: newKey });
    if (existing) throw new AppError(`Template key '${newKey}' already exists`, 409);

    obj.templateKey = newKey;
    obj.label = req.body.label || {
        en: `${obj.label.en} (Copy)`,
        bn: `${obj.label.bn} (কপি)`,
    };
    obj.status = "DRAFT";

    const clone = await QuestionTemplate.create(obj);
    res.status(201).json({ success: true, data: clone });
};

/**
 * GET /templates/:id/usage
 * Find which subjects reference this template.
 */
export const getTemplateUsage = async (req, res) => {
    const subjects = await Subject.find({ questionTemplates: req.params.id })
        .select("name subjectCode level group");
    res.json({ success: true, data: subjects });
};

/**
 * GET /templates/:id/schema-preview
 * Returns a flattened field reference tree that describes the expected shape
 * of question.data for this template. Useful for the question builder UI.
 *
 * Example output:
 *   [
 *     { path: "QUESTION.stem", fieldType: "BILINGUAL_TEXT", isRequired: true },
 *     { path: "QUESTION.parts[]", fieldType: "CQ_GROUP", isRequired: true },
 *     { path: "QUESTION.parts[].text", fieldType: "RICH_TEXT", isRequired: true },
 *     { path: "QUESTION.parts[].topicId", fieldType: "REFERENCE", isRequired: false },
 *   ]
 */
export const getTemplateSchemaPreview = async (req, res) => {
    const template = await QuestionTemplate.findById(req.params.id);
    if (!template) throw new AppError("Template not found", 404);

    const flattenFields = (fields, prefix = "", result = []) => {
        for (const field of fields || []) {
            const path = prefix ? `${prefix}.${field.key}` : field.key;
            result.push({
                path,
                fieldType: field.fieldType,
                label: field.label,
                isRequired: field.isRequired,
                referenceConfig: field.referenceConfig || null,
                referenceCollection: field.referenceCollection || null,
            });
            if (field.children?.length) {
                const childPrefix =
                    field.fieldType === "NESTED_GROUP" ? path : `${path}[]`;
                flattenFields(field.children, childPrefix, result);
            }
        }
        return result;
    };

    const schemaPreview = {};
    for (const section of template.sections) {
        schemaPreview[section.sectionKey] = flattenFields(section.fields);
    }

    res.json({ success: true, data: schemaPreview });
};

/**
 * DELETE /templates/:id
 * Delete a template. Warns if subjects still reference it.
 */
export const deleteTemplate = async (req, res) => {
    const usageCount = await Subject.countDocuments({ questionTemplates: req.params.id });
    if (usageCount > 0 && !req.query.force) {
        throw new AppError(
            `Template is used by ${usageCount} subject(s). Pass ?force=true to delete anyway.`,
            409
        );
    }

    // Remove from all subjects that reference it
    if (usageCount > 0) {
        await Subject.updateMany(
            { questionTemplates: req.params.id },
            { $pull: { questionTemplates: req.params.id } }
        );
    }

    const result = await QuestionTemplate.findByIdAndDelete(req.params.id);
    if (!result) throw new AppError("Template not found", 404);
    res.json({ success: true, message: "Template deleted" });
};
