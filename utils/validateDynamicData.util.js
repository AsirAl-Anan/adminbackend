import mongoose from "mongoose";

/**
 * Validates a dynamic data object against an array of field definitions.
 *
 * Used by:
 *   - TaxonomyNode controller: validates node.data against subject.taxonomyConfig[nodeType].dataSchema
 *   - Question controller: validates question.data against subject.questionTemplates[templateKey].fields
 *
 * @param {Object} data            - The data object to validate
 * @param {Array}  fieldDefinitions - Array of field definition objects from the schema
 * @param {string} path            - Dot-notation path prefix for nested error reporting
 * @param {number} [depth=0]       - Current recursion depth (guards against stack overflow)
 * @returns {Array} Array of error objects: [{ field: "path.to.field", message: "Error message" }]
 */
export const validateDynamicData = (data, fieldDefinitions, path = "", depth = 0) => {
    const errors = [];

    // Guard: prevent stack overflow on deeply nested or malicious payloads
    if (depth > 10) {
        errors.push({ field: path || "root", message: "Maximum validation depth exceeded" });
        return errors;
    }

    if (!fieldDefinitions || !Array.isArray(fieldDefinitions)) return errors;

    for (const field of fieldDefinitions) {
        const value = data?.[field.key];
        const fieldPath = path ? `${path}.${field.key}` : field.key;

        // --- Required check ---
        if (field.isRequired) {
            const isEmpty =
                value === undefined ||
                value === null ||
                value === "" ||
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0);

            if (isEmpty) {
                errors.push({
                    field: fieldPath,
                    message: `${field.label?.en || field.key} is required`,
                });
                continue;
            }
        }

        // Skip further validation if value is absent (and not required)
        if (value === undefined || value === null) continue;

        // --- Type-specific validation ---
        switch (field.fieldType) {
            case "NUMBER": {
                if (typeof value !== "number") {
                    errors.push({ field: fieldPath, message: `${field.label?.en || field.key} must be a number` });
                } else {
                    if (field.validation?.min !== undefined && value < field.validation.min) {
                        errors.push({ field: fieldPath, message: `Minimum value is ${field.validation.min}` });
                    }
                    if (field.validation?.max !== undefined && value > field.validation.max) {
                        errors.push({ field: fieldPath, message: `Maximum value is ${field.validation.max}` });
                    }
                }
                break;
            }

            case "TEXT":
            case "RICH_TEXT": {
                if (typeof value !== "string") {
                    errors.push({ field: fieldPath, message: `${field.label?.en || field.key} must be text` });
                } else {
                    if (field.validation?.maxLength && value.length > field.validation.maxLength) {
                        errors.push({ field: fieldPath, message: `Maximum length is ${field.validation.maxLength}` });
                    }
                    if (field.validation?.pattern) {
                        const regex = new RegExp(field.validation.pattern);
                        if (!regex.test(value)) {
                            errors.push({ field: fieldPath, message: `${field.label?.en || field.key} has invalid format` });
                        }
                    }
                }
                break;
            }

            case "BILINGUAL_TEXT": {
                if (typeof value !== "object" || Array.isArray(value)) {
                    errors.push({ field: fieldPath, message: `${field.label?.en || field.key} must be a bilingual object` });
                } else if (!value.en && !value.bn) {
                    errors.push({ field: fieldPath, message: `${field.label?.en || field.key} must have at least en or bn text` });
                }
                break;
            }

            case "BOOLEAN": {
                if (typeof value !== "boolean") {
                    errors.push({ field: fieldPath, message: `${field.label?.en || field.key} must be true or false` });
                }
                break;
            }

            case "SELECT": {
                if (field.options?.length && !field.options.includes(value)) {
                    errors.push({
                        field: fieldPath,
                        message: `${field.label?.en || field.key} must be one of: ${field.options.join(", ")}`,
                    });
                }
                break;
            }

            case "MULTI_SELECT": {
                if (!Array.isArray(value)) {
                    errors.push({ field: fieldPath, message: `${field.label?.en || field.key} must be an array` });
                } else if (field.options?.length) {
                    const invalid = value.filter((v) => !field.options.includes(v));
                    if (invalid.length) {
                        errors.push({
                            field: fieldPath,
                            message: `Invalid values: ${invalid.join(", ")}. Allowed: ${field.options.join(", ")}`,
                        });
                    }
                }
                break;
            }

            case "REFERENCE": {
                if (!mongoose.Types.ObjectId.isValid(value)) {
                    errors.push({ field: fieldPath, message: `${field.label?.en || field.key} must be a valid ID` });
                }
                break;
            }

            case "REFERENCE_ARRAY": {
                if (!Array.isArray(value)) {
                    errors.push({ field: fieldPath, message: `${field.label?.en || field.key} must be an array` });
                } else {
                    value.forEach((v, i) => {
                        if (!mongoose.Types.ObjectId.isValid(v)) {
                            errors.push({ field: `${fieldPath}[${i}]`, message: `Invalid ID at index ${i}` });
                        }
                    });
                }
                break;
            }

            case "IMAGE_ARRAY":
            case "CONTENT_BLOCKS":
            case "KEY_VALUE_ARRAY": {
                if (!Array.isArray(value)) {
                    errors.push({ field: fieldPath, message: `${field.label?.en || field.key} must be an array` });
                }
                break;
            }

            case "NESTED_GROUP": {
                if (typeof value === "object" && !Array.isArray(value) && field.children?.length) {
                    const childErrors = validateDynamicData(value, field.children, fieldPath, depth + 1);
                    errors.push(...childErrors);
                } else if (typeof value !== "object" || Array.isArray(value)) {
                    errors.push({ field: fieldPath, message: `${field.label?.en || field.key} must be an object` });
                }
                break;
            }

            case "REPEATABLE_GROUP": {
                if (!Array.isArray(value)) {
                    errors.push({ field: fieldPath, message: `${field.label?.en || field.key} must be an array` });
                } else {
                    // Validate min/max items
                    if (field.validation?.minItems !== undefined && value.length < field.validation.minItems) {
                        errors.push({ field: fieldPath, message: `Minimum ${field.validation.minItems} item(s) required` });
                    }
                    if (field.validation?.maxItems !== undefined && value.length > field.validation.maxItems) {
                        errors.push({ field: fieldPath, message: `Maximum ${field.validation.maxItems} item(s) allowed` });
                    }
                    if (field.children?.length) {
                        value.forEach((item, i) => {
                            const childErrors = validateDynamicData(item, field.children, `${fieldPath}[${i}]`, depth + 1);
                            errors.push(...childErrors);
                        });
                    }
                }
                break;
            }

            case "CQ_GROUP": {
                if (!Array.isArray(value)) {
                    errors.push({ field: fieldPath, message: `${field.label?.en || field.key} must be an array` });
                } else {
                    // Validate min/max items
                    if (field.validation?.minItems !== undefined && value.length < field.validation.minItems) {
                        errors.push({ field: fieldPath, message: `Minimum ${field.validation.minItems} part(s) required` });
                    }
                    if (field.validation?.maxItems !== undefined && value.length > field.validation.maxItems) {
                        errors.push({ field: fieldPath, message: `Maximum ${field.validation.maxItems} part(s) allowed` });
                    }
                    if (field.children?.length) {
                        value.forEach((item, i) => {
                            const childErrors = validateDynamicData(item, field.children, `${fieldPath}[${i}]`, depth + 1);
                            errors.push(...childErrors);
                        });
                    }
                }
                break;
            }

            case "MCQ_OPTIONS": {
                if (!Array.isArray(value)) {
                    errors.push({ field: fieldPath, message: "Options must be an array" });
                } else {
                    if (value.length < 2) {
                        errors.push({ field: fieldPath, message: "At least 2 options are required" });
                    }
                    if (!value.some((opt) => opt.isCorrect)) {
                        errors.push({ field: fieldPath, message: "At least one correct option is required" });
                    }
                    value.forEach((opt, i) => {
                        if (!opt.identifier) {
                            errors.push({ field: `${fieldPath}[${i}].identifier`, message: "Option identifier is required" });
                        }
                        if (!opt.text?.en && !opt.text?.bn) {
                            errors.push({ field: `${fieldPath}[${i}].text`, message: "Option text is required" });
                        }
                    });
                }
                break;
            }

            default:
                // Unknown field types are allowed (extensibility)
                break;
        }
    }

    return errors;
};
