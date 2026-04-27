import EducationalContent from "../../models/educationalContent.model.js";
import ContentTemplate from "../../models/contentTemplate.model.js";
import TaxonomyNode from "../../models/taxonomyNode.model.js";
import { AppError } from "../../utils/errors.js";

export const createContent = async (req, res, next) => {
    const { templateId, nodeId, sections, status, title } = req.body;

    const template = await ContentTemplate.findById(templateId);
    if (!template) throw new AppError("Content template not found", 404);

    const node = await TaxonomyNode.findById(nodeId);
    if (!node) throw new AppError("Taxonomy node not found", 404);

    // Basic validation. A more robust implementation would check types against template fields
    if (!sections || !Array.isArray(sections)) {
       throw new AppError("Sections array is required", 400);
    }

    const content = await EducationalContent.create({
        template: templateId,
        node: nodeId,
        subject: node.subjectId,
        sections,
        status: status || "DRAFT",
        title: title || "Untitled Content",
        createdBy: req.user._id || req.user.id // Handle cases where it's populated as _id
    });

    res.status(201).json({ success: true, data: content });
};

export const getContentByNode = async (req, res, next) => {
    try {
        const { nodeId } = req.params;
        
        const contents = await EducationalContent.find({ node: nodeId })
            .populate("template", "templateKey label category icon sections")
            .populate("createdBy", "fullname email")
            .sort({ createdAt: -1 });

        res.json({ success: true, data: contents });
    } catch (err) {
        console.error("Error in getContentByNode:", err);
        res.status(500).json({ success: false, message: err.message, stack: err.stack });
    }
};

export const updateContent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { sections, status, title } = req.body;

        const content = await EducationalContent.findById(id);
        if (!content) throw new AppError("Educational content not found", 404);

        if (sections) content.sections = sections;
        if (status) content.status = status;
        if (title) content.title = title;

        await content.save();

        // Populate and return
        const populatedContent = await EducationalContent.findById(id)
            .populate("template", "templateKey label category icon sections")
            .populate("createdBy", "fullname email");

        res.json({ success: true, data: populatedContent });
    } catch (err) {
        console.error("Error in updateContent:", err);
        res.status(500).json({ success: false, message: err.message, stack: err.stack });
    }
};

export const deleteContent = async (req, res, next) => {
    const { id } = req.params;
    
    const content = await EducationalContent.findByIdAndDelete(id);
    if (!content) throw new AppError("Educational content not found", 404);

    res.json({ success: true, message: "Content deleted successfully" });
};
