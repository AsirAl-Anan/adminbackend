import UnifiedQuestion from "../models/question.unified.model.js";
import QuestionTemplate from "../models/questionTemplate.model.js";
import Subject from "../models/subject.model.js";
import { validateDynamicData } from "../utils/validateDynamicData.util.js";
import { extractTaxonomyLinks } from "../utils/extractTaxonomyLinks.util.js";

// @desc    Create a new dynamic question
// @route   POST /api/unified-questions
// @access  Private/Admin
export const createQuestion = async (req, res) => {
    try {
        const { subjectId, templateKey, data, source, meta, marks, difficulty, status } = req.body;

        if (!subjectId || !templateKey || !data) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        // 1. Verify subject exists
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ success: false, message: "Subject not found" });
        }

        // 2. Verify the template exists (fetch directly — questionTemplates[] holds ObjectId refs, not embedded docs)
        const template = await QuestionTemplate.findOne({ templateKey });
        if (!template) {
            return res.status(404).json({
                success: false,
                message: `Template '${templateKey}' not found`,
            });
        }

        // 3. Verify template is attached to this subject
        const isAttached = subject.questionTemplates.some(
            (ref) => ref.toString() === template._id.toString()
        );
        if (!isAttached) {
            return res.status(400).json({
                success: false,
                message: `Template '${templateKey}' is not configured for this subject`,
            });
        }

        // 4. Validate Question Data section-by-section
        const validationErrors = [];
        const processedData = {};

        for (const section of template.sections) {
            const sectionKey = section.sectionKey;
            const sectionData = data[sectionKey] || {};
            const sectionErrors = validateDynamicData(sectionData, section.fields || []);
            
            if (sectionErrors.length > 0) {
                validationErrors.push(...sectionErrors.map(err => `[${sectionKey}] ${err}`));
            }
            processedData[sectionKey] = sectionData;
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Data validation failed against the template definition",
                errors: validationErrors,
            });
        }

        // 5. Auto-extract taxonomy links from section data
        let taxonomyLinks = [];
        for (const section of template.sections) {
            const sectionLinks = extractTaxonomyLinks(processedData[section.sectionKey], section.fields || []);
            // Prefix field paths with the section key for accuracy
            const prefixedLinks = sectionLinks.map(link => ({
                ...link,
                fieldPath: `${section.sectionKey}.${link.fieldPath}`
            }));
            taxonomyLinks.push(...prefixedLinks);
        }

        // 6. Create
        const question = await UnifiedQuestion.create({
            subjectId,
            templateKey,
            status: status || "DRAFT",
            source: source || null,
            marks: marks || null,
            difficulty: difficulty || null,
            meta: meta || { level: "", group: "", aliases: {}, tags: {} },
            data: processedData,
            taxonomyLinks,
        });

        res.status(201).json({
            success: true,
            data: question,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get questions attached to a specific taxonomy node
// @route   GET /api/unified-questions/node/:nodeId
// @access  Private/Admin
export const getQuestionsByNode = async (req, res) => {
    try {
        const { nodeId } = req.params;
        const { templateKey, status, page = 1, limit = 20, search } = req.query;

        const filter = { "taxonomyLinks.nodeId": nodeId };
        if (templateKey) filter.templateKey = templateKey;
        if (status) filter.status = status;

        // Optional basic text search across typical text fields in dynamic data
        if (search) {
            // This is a basic generic search. Given the highly nested and varied
            // nature of data: Mixed, a proper search ideally requires a text index,
            // Atlas Search, or targeted field searching based on the template.
            // Below is an example of searching common bilingual paths
            filter.$or = [
                { "data.QUESTION.stem.en": { $regex: search, $options: "i" } },
                { "data.QUESTION.stem.bn": { $regex: search, $options: "i" } },
                { "data.QUESTION.question.en": { $regex: search, $options: "i" } },
                { "data.QUESTION.question.bn": { $regex: search, $options: "i" } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [questions, total] = await Promise.all([
            UnifiedQuestion.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            UnifiedQuestion.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: questions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get questions for a whole subject
// @route   GET /api/unified-questions/subject/:subjectId
// @access  Private/Admin
export const getQuestionsBySubject = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const { templateKey, status, page = 1, limit = 20 } = req.query;

        const filter = { subjectId };
        if (templateKey) filter.templateKey = templateKey;
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [questions, total] = await Promise.all([
            UnifiedQuestion.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            UnifiedQuestion.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: questions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single question
// @route   GET /api/unified-questions/:id
// @access  Private/Admin
export const getQuestionById = async (req, res) => {
    try {
        const question = await UnifiedQuestion.findById(req.params.id)
            .populate("subjectId", "name subjectCode questionTemplates"); // Populate templates for frontend convenience

        if (!question) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }

        res.status(200).json({
            success: true,
            data: question,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a question
// @route   PUT /api/unified-questions/:id
// @access  Private/Admin
export const updateQuestion = async (req, res) => {
    try {
        const question = await UnifiedQuestion.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }

        const { data } = req.body;

        // Validate new data if provided
        if (data) {
            // Fetch template directly (questionTemplates[] on subject are ObjectId refs, not embedded docs)
            const template = await QuestionTemplate.findOne({ templateKey: question.templateKey });

            if (template) {
                const validationErrors = [];
                const processedData = {};

                for (const section of template.sections) {
                    const sectionKey = section.sectionKey;
                    const sectionData = data[sectionKey] || {};
                    const sectionErrors = validateDynamicData(sectionData, section.fields || []);
                    
                    if (sectionErrors.length > 0) {
                        validationErrors.push(...sectionErrors.map(err => `[${sectionKey}] ${err}`));
                    }
                    processedData[sectionKey] = sectionData;
                }

                if (validationErrors.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Updated data validation failed",
                        errors: validationErrors,
                    });
                }

                // Re-extract taxonomy links from section data
                let taxonomyLinks = [];
                for (const section of template.sections) {
                    const sectionLinks = extractTaxonomyLinks(processedData[section.sectionKey], section.fields || []);
                    const prefixedLinks = sectionLinks.map(link => ({
                        ...link,
                        fieldPath: `${section.sectionKey}.${link.fieldPath}`
                    }));
                    taxonomyLinks.push(...prefixedLinks);
                }

                req.body.data = processedData;
                req.body.taxonomyLinks = taxonomyLinks;
            }
        }

        // Merge updates
        Object.assign(question, req.body);
        question.markModified("data");
        question.markModified("taxonomyLinks");

        await question.save();

        res.status(200).json({
            success: true,
            data: question,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a question
// @route   DELETE /api/unified-questions/:id
// @access  Private/Admin
export const deleteQuestion = async (req, res) => {
    try {
        const result = await UnifiedQuestion.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }

        res.status(200).json({
            success: true,
            message: "Question deleted successfully",
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get questions linked to a specific taxonomy node via taxonomyLinks[]
// @route   GET /api/unified-questions/by-taxonomy-link/:nodeId
// @access  Private/Admin
export const getQuestionsByTaxonomyLink = async (req, res) => {
    try {
        const { nodeId } = req.params;
        const { subjectId, semanticRole, templateKey, status, page = 1, limit = 20 } = req.query;

        // Build filter using the indexed taxonomyLinks array
        const filter = { "taxonomyLinks.nodeId": nodeId };
        if (subjectId) filter.subjectId = subjectId;
        if (semanticRole) filter["taxonomyLinks.semanticRole"] = semanticRole;
        if (templateKey) filter.templateKey = templateKey;
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [questions, total] = await Promise.all([
            UnifiedQuestion.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate("subjectId", "name subjectCode"),
            UnifiedQuestion.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: questions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
