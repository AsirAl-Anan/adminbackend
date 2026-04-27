import UnifiedQuestion from "../../models/question.unified.model.js";
import Subject from "../../models/subject.model.js";
import { validateDynamicData } from "../../utils/validateDynamicData.util.js";
import { extractTaxonomyLinks } from "../../utils/extractTaxonomyLinks.util.js";
import { AppError } from "../../utils/errors.js";

// @desc  Create a question
// @route POST /api/v1/questions
export const createQuestion = async (req, res) => {
    const { subjectId, templateKey, data, source, meta, marks, difficulty, status } = req.body;
    if (!subjectId || !templateKey || !data) throw new AppError("subjectId, templateKey, and data are required", 400);

    const subject = await Subject.findById(subjectId).populate("questionTemplates");
    if (!subject) throw new AppError("Subject not found", 404);

    const template = subject.questionTemplates.find(t => t.templateKey === templateKey);
    if (!template) throw new AppError(`Template '${templateKey}' is not configured for this subject`, 400);

    const errors = [];
    if (template.sections) {
        for (const section of template.sections) {
            const sectionData = data[section.sectionKey] || {};
            const sectionErrors = validateDynamicData(sectionData, section.fields);
            if (sectionErrors.length) {
                errors.push(...sectionErrors.map(e => ({ ...e, field: `data.${section.sectionKey}.${e.field}` })));
            }
        }
    }
    if (errors.length) return res.status(400).json({ success: false, message: "Data validation failed", errors });

    const taxonomyLinks = extractTaxonomyLinks(data, template.sections);

    const question = await UnifiedQuestion.create({ 
        subjectId, templateKey, status: status || "DRAFT", 
        source, marks, difficulty, meta, data, taxonomyLinks 
    });
    res.status(201).json({ success: true, data: question });
};

// @desc  Get single question
// @route GET /api/v1/questions/:id
export const getQuestionById = async (req, res) => {
    const question = await UnifiedQuestion.findById(req.params.id)
        .populate("subjectId", "name subjectCode questionTemplates");
    if (!question) throw new AppError("Question not found", 404);
    res.json({ success: true, data: question });
};

// @desc  Get questions for a taxonomy node (paginated)
// @route GET /api/v1/questions/node/:nodeId
export const getQuestionsByNode = async (req, res) => {
    const { nodeId } = req.params;
    const { templateKey, status, page = 1, limit = 20, search } = req.query;
    const filter = { "taxonomyLinks.nodeId": nodeId };
    if (templateKey) filter.templateKey = templateKey;
    if (status) filter.status = status;
    if (search) {
        filter.$or = [
            { "data.stem.en": { $regex: search, $options: "i" } },
            { "data.stem.bn": { $regex: search, $options: "i" } },
            { "data.question.en": { $regex: search, $options: "i" } },
            { "data.question.bn": { $regex: search, $options: "i" } },
        ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [questions, total] = await Promise.all([
        UnifiedQuestion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
        UnifiedQuestion.countDocuments(filter),
    ]);
    res.json({ success: true, data: questions, pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) } });
};

// @desc  Get all questions for a subject (paginated)
// @route GET /api/v1/questions/subject/:subjectId
export const getQuestionsBySubject = async (req, res) => {
    const { subjectId } = req.params;
    const { templateKey, status, page = 1, limit = 20 } = req.query;
    const filter = { subjectId };
    if (templateKey) filter.templateKey = templateKey;
    if (status) filter.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [questions, total] = await Promise.all([
        UnifiedQuestion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
        UnifiedQuestion.countDocuments(filter),
    ]);
    res.json({ success: true, data: questions, pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) } });
};

// @desc  Update a question
// @route PUT /api/v1/questions/:id
export const updateQuestion = async (req, res) => {
    const question = await UnifiedQuestion.findById(req.params.id);
    if (!question) throw new AppError("Question not found", 404);

    if (req.body.data) {
        const subject = await Subject.findById(question.subjectId).populate("questionTemplates");
        const template = subject?.questionTemplates.find(t => t.templateKey === question.templateKey);
        
        const errors = [];
        if (template?.sections) {
            for (const section of template.sections) {
                const sectionData = req.body.data[section.sectionKey] || {};
                const sectionErrors = validateDynamicData(sectionData, section.fields);
                if (sectionErrors.length) {
                    errors.push(...sectionErrors.map(e => ({ ...e, field: `data.${section.sectionKey}.${e.field}` })));
                }
            }
        }
        if (errors.length) return res.status(400).json({ success: false, message: "Data validation failed", errors });

        question.taxonomyLinks = extractTaxonomyLinks(req.body.data, template?.sections || []);
    }

    Object.assign(question, req.body);
    question.markModified("data");
    await question.save();
    res.json({ success: true, data: question });
};

// @desc  Update question status only
// @route PUT /api/v1/questions/:id/status
export const updateQuestionStatus = async (req, res) => {
    const { status } = req.body;
    if (!["PUBLISHED", "DRAFT", "UNDER_REVIEW"].includes(status)) throw new AppError("Invalid status value", 400);
    const question = await UnifiedQuestion.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!question) throw new AppError("Question not found", 404);
    res.json({ success: true, data: question });
};

// @desc  Delete a question
// @route DELETE /api/v1/questions/:id
export const deleteQuestion = async (req, res) => {
    const result = await UnifiedQuestion.findByIdAndDelete(req.params.id);
    if (!result) throw new AppError("Question not found", 404);
    res.json({ success: true, message: "Question deleted" });
};
