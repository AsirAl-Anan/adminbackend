import Subject from "../../models/subject.model.js";
import TaxonomyNode from "../../models/taxonomyNode.model.js";
import UnifiedQuestion from "../../models/question.unified.model.js";
import QuestionTemplate from "../../models/questionTemplate.model.js";
import { AppError } from "../../utils/errors.js";

// ─── Subject CRUD ─────────────────────────────────────────────────────────────

export const getAllSubjects = async (req, res, next) => {
    const { level, group } = req.query;
    const filter = {};
    if (level) filter.level = level;
    if (group) filter.group = group;
    const subjects = await Subject.find(filter)
        .select("name subjectCode level group taxonomyConfig questionTemplates contentTemplates")
        .populate("questionTemplates", "templateKey label family icon status")
        .populate("contentTemplates", "templateKey label category icon status sections")
        .sort({ subjectCode: 1 });
    res.json({ success: true, data: subjects });
};

export const getSubjectById = async (req, res, next) => {
    const subject = await Subject.findById(req.params.id)
        .populate("questionTemplates")
        .populate("contentTemplates");
    if (!subject) throw new AppError("Subject not found", 404);
    res.json({ success: true, data: subject });
};

export const createSubject = async (req, res, next) => {
    const { name, subjectCode, level, group, aliases } = req.body;
    if (!subjectCode || !level || !group) throw new AppError("subjectCode, level, and group are required", 400);
    const subject = await Subject.create({ name, subjectCode, level, group, aliases });
    res.status(201).json({ success: true, data: subject });
};

export const updateSubject = async (req, res, next) => {
    const allowed = ["name", "subjectCode", "aliases"];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const subject = await Subject.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!subject) throw new AppError("Subject not found", 404);
    res.json({ success: true, data: subject });
};

export const deleteSubject = async (req, res, next) => {
    const subject = await Subject.findById(req.params.id);
    if (!subject) throw new AppError("Subject not found", 404);
    await Promise.all([
        TaxonomyNode.deleteMany({ subjectId: subject._id }),
        UnifiedQuestion.deleteMany({ subjectId: subject._id }),
        Subject.findByIdAndDelete(subject._id),
    ]);
    res.json({ success: true, message: "Subject and all related data deleted" });
};

// ─── TaxonomyConfig Management ────────────────────────────────────────────────

export const updateTaxonomyConfig = async (req, res, next) => {
    const { taxonomyConfig } = req.body;
    if (!Array.isArray(taxonomyConfig)) throw new AppError("taxonomyConfig must be an array", 400);
    const subject = await Subject.findByIdAndUpdate(
        req.params.id,
        { taxonomyConfig },
        { new: true, runValidators: true }
    );
    if (!subject) throw new AppError("Subject not found", 404);
    res.json({ success: true, data: subject.taxonomyConfig });
};

// ─── Question Template Management (Reference-based) ───────────────────────────

/**
 * POST /subjects/:id/templates
 * Attach an existing QuestionTemplate to this subject by its _id.
 * Body: { templateId }
 */
export const addTemplate = async (req, res, next) => {
    const subject = await Subject.findById(req.params.id);
    if (!subject) throw new AppError("Subject not found", 404);

    const { templateId } = req.body;
    if (!templateId) throw new AppError("templateId is required", 400);

    // Validate template exists
    const template = await QuestionTemplate.findById(templateId);
    if (!template) throw new AppError("Template not found", 404);

    // Check for duplicate
    if (subject.questionTemplates.some((id) => id.toString() === templateId)) {
        throw new AppError("Template already attached to this subject", 409);
    }

    subject.questionTemplates.push(templateId);
    await subject.save();

    res.status(201).json({ success: true, data: template });
};

/**
 * DELETE /subjects/:id/templates/:templateId
 * Detach a template from this subject.
 */
export const removeTemplate = async (req, res, next) => {
    const subject = await Subject.findById(req.params.id);
    if (!subject) throw new AppError("Subject not found", 404);

    const idx = subject.questionTemplates.findIndex(
        (id) => id.toString() === req.params.templateId
    );
    if (idx === -1) throw new AppError("Template not attached to this subject", 404);

    subject.questionTemplates.splice(idx, 1);
    await subject.save();
    res.json({ success: true, message: "Template detached" });
};

// ─── Content Template Management (Reference-based) ────────────────────────────

import ContentTemplate from "../../models/contentTemplate.model.js";

/**
 * POST /subjects/:id/content-templates
 * Attach an existing ContentTemplate to this subject by its _id.
 * Body: { templateId }
 */
export const addContentTemplate = async (req, res, next) => {
    const subject = await Subject.findById(req.params.id);
    if (!subject) throw new AppError("Subject not found", 404);

    const { templateId } = req.body;
    if (!templateId) throw new AppError("templateId is required", 400);

    // Validate template exists
    const template = await ContentTemplate.findById(templateId);
    if (!template) throw new AppError("Content Template not found", 404);

    // Check for duplicate
    if (subject.contentTemplates.some((id) => id.toString() === templateId)) {
        throw new AppError("Content Template already attached to this subject", 409);
    }

    subject.contentTemplates.push(templateId);
    await subject.save();

    res.status(201).json({ success: true, data: template });
};

/**
 * DELETE /subjects/:id/content-templates/:templateId
 * Detach a content template from this subject.
 */
export const removeContentTemplate = async (req, res, next) => {
    const subject = await Subject.findById(req.params.id);
    if (!subject) throw new AppError("Subject not found", 404);

    const idx = subject.contentTemplates.findIndex(
        (id) => id.toString() === req.params.templateId
    );
    if (idx === -1) throw new AppError("Content Template not attached to this subject", 404);

    subject.contentTemplates.splice(idx, 1);
    await subject.save();
    res.json({ success: true, message: "Content Template detached" });
};
