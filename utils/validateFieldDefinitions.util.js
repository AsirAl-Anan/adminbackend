/**
 * validateFieldDefinitions
 *
 * Application-layer validator for template field definition schemas.
 * Called before saving a QuestionTemplate to ensure the field tree is
 * structurally sound, even though `children` is stored as Mixed in Mongoose.
 *
 * Enforces:
 *   - Required properties on every field (key, fieldType, label)
 *   - fieldType is from the allowed enum
 *   - Children only exist on group types
 *   - Nesting depth does not exceed MAX_DEPTH
 *   - Key uniqueness within each parent scope
 *   - No self-referential conditionalOn (same key in same scope)
 *
 * @param {Array}  fields      - Field definition objects to validate
 * @param {number} [maxDepth]  - Max allowed nesting depth (default: 4)
 * @param {number} [depth=0]   - Current recursion depth
 * @param {string} [path=""]   - Dot-path prefix for error messages
 * @returns {Array} errors     - [{ field: "path", message: "..." }]
 */

const ALLOWED_FIELD_TYPES = [
    "TEXT", "RICH_TEXT", "BILINGUAL_TEXT", "NUMBER",
    "SELECT", "MULTI_SELECT", "IMAGE_ARRAY", "CONTENT_BLOCKS",
    "REFERENCE", "REFERENCE_ARRAY", "KEY_VALUE_ARRAY",
    "NESTED_GROUP", "BOOLEAN", "MCQ_OPTIONS",
    "REPEATABLE_GROUP", "CQ_GROUP",
];

const GROUP_TYPES = new Set(["NESTED_GROUP", "REPEATABLE_GROUP", "CQ_GROUP"]);

export const validateFieldDefinitions = (fields, maxDepth = 4, depth = 0, path = "") => {
    const errors = [];

    if (!Array.isArray(fields)) return errors;

    // Guard: depth limit
    if (depth > maxDepth) {
        errors.push({
            field: path || "root",
            message: `Nesting depth exceeds maximum of ${maxDepth} levels`,
        });
        return errors;
    }

    const seenKeys = new Set();

    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const fieldPath = path ? `${path}[${i}]` : `fields[${i}]`;

        if (!field || typeof field !== "object") {
            errors.push({ field: fieldPath, message: "Field must be an object" });
            continue;
        }

        // --- Required: key ---
        if (!field.key || typeof field.key !== "string" || !field.key.trim()) {
            errors.push({ field: `${fieldPath}.key`, message: "Field key is required and must be a non-empty string" });
        } else {
            // Key uniqueness within this scope
            if (seenKeys.has(field.key)) {
                errors.push({ field: `${fieldPath}.key`, message: `Duplicate field key: '${field.key}'` });
            }
            seenKeys.add(field.key);

            // Key format: alphanumeric + underscores only
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key)) {
                errors.push({
                    field: `${fieldPath}.key`,
                    message: `Field key '${field.key}' must start with a letter/underscore and contain only letters, numbers, and underscores`,
                });
            }
        }

        // --- Required: fieldType ---
        if (!field.fieldType) {
            errors.push({ field: `${fieldPath}.fieldType`, message: "Field type is required" });
        } else if (!ALLOWED_FIELD_TYPES.includes(field.fieldType)) {
            errors.push({
                field: `${fieldPath}.fieldType`,
                message: `Invalid field type '${field.fieldType}'. Must be one of: ${ALLOWED_FIELD_TYPES.join(", ")}`,
            });
        }

        // --- Required: label ---
        if (!field.label || typeof field.label !== "object") {
            errors.push({ field: `${fieldPath}.label`, message: "Field label is required and must be an object with en/bn" });
        } else {
            if (!field.label.en || typeof field.label.en !== "string") {
                errors.push({ field: `${fieldPath}.label.en`, message: "English label is required" });
            }
            if (!field.label.bn || typeof field.label.bn !== "string") {
                errors.push({ field: `${fieldPath}.label.bn`, message: "Bangla label is required" });
            }
        }

        // --- Children only on group types ---
        const isGroupType = GROUP_TYPES.has(field.fieldType);
        if (field.children?.length && !isGroupType) {
            errors.push({
                field: `${fieldPath}.children`,
                message: `Field type '${field.fieldType}' cannot have children. Only NESTED_GROUP, REPEATABLE_GROUP, and CQ_GROUP support children.`,
            });
        }

        // --- Recursively validate children of group types ---
        if (isGroupType && field.children?.length) {
            const childErrors = validateFieldDefinitions(
                field.children,
                maxDepth,
                depth + 1,
                `${fieldPath}.children`
            );
            errors.push(...childErrors);
        }

        // --- Validate conditionalOn: must reference a different key ---
        if (field.conditionalOn?.field) {
            if (field.conditionalOn.field === field.key) {
                errors.push({
                    field: `${fieldPath}.conditionalOn`,
                    message: `Field '${field.key}' cannot be conditional on itself`,
                });
            }
        }

        // --- Validate SELECT/MULTI_SELECT have options ---
        if ((field.fieldType === "SELECT" || field.fieldType === "MULTI_SELECT") && !field.options?.length) {
            errors.push({
                field: `${fieldPath}.options`,
                message: `SELECT/MULTI_SELECT field '${field.key || ""}' must have at least one option`,
            });
        }

        // --- Validate REFERENCE has a collection ---
        if ((field.fieldType === "REFERENCE" || field.fieldType === "REFERENCE_ARRAY")) {
            const hasCollection = field.referenceConfig?.collection || field.referenceCollection;
            if (!hasCollection) {
                errors.push({
                    field: `${fieldPath}.referenceConfig`,
                    message: `REFERENCE field '${field.key || ""}' must specify a referenceConfig.collection or referenceCollection`,
                });
            }
        }
    }

    return errors;
};
