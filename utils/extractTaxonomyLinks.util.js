import mongoose from "mongoose";

/**
 * Parses dynamic data against template schemas to extract all REFERENCE/REFERENCE_ARRAY fields
 * that point to "TaxonomyNode" collections, returning them as a flat array for the UnifiedQuestion model.
 * 
 * @param {Object} data - The entire question data object spanning all sections (e.g. { QUESTION: {...}, ANSWER: {...} })
 * @param {Array} sections - The template.sections array (each containing "fields")
 * @returns {Array} Array of { fieldPath, nodeId, semanticRole }
 */
export const extractTaxonomyLinks = (data, sections) => {
    const links = [];

    const traverse = (currentData, fieldDefs, currentPath) => {
        if (!currentData || !fieldDefs || !Array.isArray(fieldDefs)) return;

        for (const field of fieldDefs) {
            const value = currentData[field.key];
            if (value === undefined || value === null) continue;

            const fieldPath = currentPath ? `${currentPath}.${field.key}` : field.key;
            const refCollection = field.referenceConfig?.collection || field.referenceCollection;
            const isTaxonomyNode = refCollection === "TaxonomyNode";

            if (field.fieldType === "REFERENCE" && isTaxonomyNode) {
                if (mongoose.Types.ObjectId.isValid(value)) {
                    links.push({
                        fieldPath,
                        nodeId: value,
                        semanticRole: field.referenceConfig?.semanticRole || "reference"
                    });
                }
            } else if (field.fieldType === "REFERENCE_ARRAY" && isTaxonomyNode) {
                if (Array.isArray(value)) {
                    value.forEach((id, idx) => {
                        if (mongoose.Types.ObjectId.isValid(id)) {
                            links.push({
                                fieldPath: `${fieldPath}[${idx}]`,
                                nodeId: id,
                                semanticRole: field.referenceConfig?.semanticRole || "reference"
                            });
                        }
                    });
                }
            } else if (field.fieldType === "NESTED_GROUP" && field.children) {
                traverse(value, field.children, fieldPath);
            } else if ((field.fieldType === "REPEATABLE_GROUP" || field.fieldType === "CQ_GROUP") && Array.isArray(value) && field.children) {
                value.forEach((item, i) => traverse(item, field.children, `${fieldPath}[${i}]`));
            }
        }
    };

    if (sections && Array.isArray(sections) && data) {
        for (const section of sections) {
            const sectionData = data[section.sectionKey] || {};
            traverse(sectionData, section.fields, `data.${section.sectionKey}`);
        }
    }

    return links;
};
