/**
 * Centralized prompts for AI image processing
 * This approach makes it easy to modify prompts without touching service logic
 */

export const PROMPTS = {
  /**
   * Prompt for extracting creative questions from images
   */
EXTRACT_QUESTIONS : `
You are given one or more images that contain several creative questions (Srijonshils) from the Bangladeshi education system.

Each complete Srijonshil question consists of:
- A **main stem/scenario**: This is the introductory text or description at the top.
- Four **sub-questions**: These are individual problem statements that are labeled as either "a.", "b.", "c.", "d." (for English and bangla both)  and are based on the main stem.

Your task:
1. Extract the **main stem/scenario** into the "stem" field.
2. Extract each of the **four sub-questions** into their respective "a", "b", "c", "d" (or "ক.", "খ.", "গ.", "ঘ." for Bangla) fields. Do not include the label (e.g., "ক.", "a.") in the extracted text for the field value.
3. **Translate the entire extracted question (main stem and all four sub-questions) into human-like Bengali.** This translation must be natural and contextually appropriate, not a literal word-for-word translation.
4. **IMPORTANT**: Regardless of whether the original question was in English or Bangla, always return the translated sub-questions in the format of "a", "b", "c", "d". Do **not** use "ক.", "খ.", "গ.", "ঘ." in the translated version.
5. If you find multiple complete Srijonshil questions in one or more images, extract all of them.
6. Only extract groups that contain at least the main stem and one clearly labeled sub-question (ideally all 4).
7. Match the main stem with its sub-questions based on visual structure and label patterns.
8. If a sub-question is missing in either the original or translated version, include its field with an empty string (e.g., "d": "" or "ঘ.": "").

⚠️ SPECIAL INSTRUCTIONS FOR MATHEMATICAL AND SCIENTIFIC NOTATION:

- KEEP ALL mathematical expressions in LaTeX format using $...$ delimiters for both original and translated content.

- Convert expressions like "4 × 10^-5" to "$4 \\\\times 10^{-5}$". Note the use of FOUR backslashes (\\\\) in this prompt example. You MUST generate the JSON string correctly using TWO backslashes (\\\\) for the LaTeX command inside the final JSON output (e.g., "$4 \\\\times 10^{-5}$").
- Convert Greek letters to LaTeX: π → "\\\\pi", μ → "\\\\mu", etc. (Again, FOUR backslashes in prompt, generate TWO in final JSON).
- Superscripts: "10^-5" → "10^{-5}"
- Subscripts: "H2O" → "H_{2}O"
- NEVER convert to Unicode superscript characters like "¹²³⁴⁵⁶⁷⁸⁹"
- ALWAYS ensure the final JSON output uses double backslashes (e.g., \\\\times, \\\\vec) for LaTeX commands within its string values.

⚠️ Output format:
-🚫 In the translated version or even in the english version, NEVER use "ক.", "খ.", "গ.", "ঘ." as keys. ONLY use "a", "b", "c", "d".

Return as **clean JSON**, an array of objects. For each detected complete Srijonshil question, you will output *two* consecutive objects in the array:
1. The first object will be the **original question set** (main stem and its sub-questions as extracted). The option keys will be "a", "b", "c", "d" for English sub-questions or "ক.", "খ.", "গ.", "ঘ." for Bangla sub-questions, depending on the original language of the sub-question.
2. The second object will be the **translated Bengali version** of that *same* question set. For the translated version, use "stem" for the Bengali stem, and **always use "a", "b", "c", "d"** as keys for the translated Bengali sub-questions — even if the original used "ক.", "খ.", etc.
here ক = a, খ = b, গ = c, ঘ = d
But always use "a", "b", "c", "d" in the translated version and original version.
[
  {
    "stem": "Original main scenario/description with $latex$ math",
    "a": "Original English sub-question a. text with $latex$ math",
    "b": "Original English sub-question b. text with $latex$ math",
    "c": "Original English sub-question c. text with $latex$ math",
    "d": "Original English sub-question d. text with $latex$ math"
  },
  {
    "stem": "Translated Bengali main scenario/description with $latex$ math",
    "a": "Translated Bengali sub-question for a. text with $latex$ math",
    "b": "Translated Bengali sub-question for b. text with $latex$ math",
    "c": "Translated Bengali sub-question for c. text with $latex$ math",
    "d": "Translated Bengali sub-question for d. text with $latex$ math"
  }
  
  {
    // ... next original question object ...
  },
  {
    // ... next translated Bengali question object ...
  }
]

⚠️ Output rules:
- Do **not** generate any answers or explanations.
- Do **not** wrap with Markdown (no triple backticks or \`\`\`json).

- If a sub-question is missing, include its field with an empty string (e.g., "d": "").
- Return **only** valid complete Srijonshil question sets (each set consisting of two consecutive objects: original then translated).
- Do not use 1,2 numbering for questions.
- Do not say anything else before or after the output; return only the JSON array.
- Return ONLY valid JSON. Ensure escape sequences within JSON string values are correct (use \\\\for LaTeX like \\\\times).
- KEEP ALL mathematical expressions in LaTeX format using $...$ delimiters for both original and translated content.

- Convert expressions like "4 × 10^-5" to "$4 \\\\times 10^{-5}$". Note the use of FOUR backslashes (\\\\) in this prompt example. You MUST generate the JSON string correctly using TWO backslashes (\\\\) for the LaTeX command inside the final JSON output (e.g., "$4 \\\\times 10^{-5}$").
- Convert Greek letters to LaTeX: π → "\\\\pi", μ → "\\\\mu", etc. (Again, FOUR backslashes in prompt, generate TWO in final JSON).
- Superscripts: "10^-5" → "10^{-5}"
- Subscripts: "H2O" → "H_{2}O"
- NEVER convert to Unicode superscript characters like "¹²³⁴⁵⁶⁷⁸⁹"
- ALWAYS ensure the final JSON output uses double backslashes (e.g., \\\\times, \\\\vec) for LaTeX commands within its string values.
`.trim(),

  /**
   * Prompt for extracting answers from images
   */
  EXTRACT_ANSWERS: `

You are given one or more images that contain the *answers* to a creative (Srijonshil) multiple-choice question from the Bangladeshi education system. You will also be given the question itself.

**Understanding the Srijonshil (Creative) System):**
The Srijonshil system (also known as the Creative Question system) in the Bangladeshi education curriculum aims to assess a student's higher-order thinking skills rather than rote memorization. For multiple-choice questions (MCQs) in this system, while there are options, the answers often reflect conceptual understanding and application of theories, and can be structured as concise paragraphs for clarity.

In these images:
- A question will appear at the top. **You must analyze this question thoroughly.**
- Below the question, you will find written **answers for the four options**.
- Each answer is labeled as either:
  - Bangla: "a.", "b.", "c.", "ঘd."
  - English: "a.", "b.", "c.", "d."

🔍 Your tasks:
1.  Extract **only the answers** labeled under  a./b./c./d for both english and bangla .
2.  **Analyze the question in conjunction with the extracted answers.**
3.  **Revise the extracted English answers:**
    * Keep the core information of the original answer.
    * Adjust the phrasing or structure to align with the typical style and conciseness of Srijonshil creative questions.
    * **For mathematical equations or calculations within an answer option:**
        * **Extract and present the equations and steps as directly as possible from the image.**
        * **Use arrows (->, =>) to show sequential steps in a calculation or derivation.**
        * **For operations involving multiple equations (e.g., simultaneous equations), use explicit notations like "Eqn (1) + Eqn (2)" or "Eqn (2) - Eqn (1)" instead of descriptive text (e.g., avoid "adding," "subtracting," "substituting").**
        * **Do NOT provide explanatory text describing the mathematical operations (e.g., do not say "by substituting the value," "then adding both sides," etc.). Just show the mathematical steps and the explicit operation if combining equations.**
    * Ensure the revised answers are coherent and flow naturally.
4.  If an option is missing, include it with an empty string.
5.  **Translate the revised English answers into human-like Bangla.** Ensure the translation uses suitable and commonly understood Bengali terms from the Bangladesh National Curriculum textbooks. Avoid literal or word-for-word translation.

⚙️ Output format:
Return a clean JSON array with two objects. The first object will contain the revised English answers, and the second object will contain their Bangla translations.

[
  {
    "aAnswer": "Revised English answer text under  a.",
    "bAnswer": "Revised English answer text under  b.",
    "cAnswer": "Revised English answer text under  c.",
    "dAnswer": "Revised English answer text under  d."
  },
  {a
    "aAnswer": "Revised Bangla translation of answer text under  a.",
    "bAnswer": "Revised Bangla translation of answer text under b.",
    "cAnswer": "Revised Bangla translation of answer text under  c.",
    "dAnswer": "Revised Bangla translation of answer text under r d."
  }
]

📌 Output rules:
- 🚫 In the translated version or even in the English version, NEVER use "ক.", "খ.", "গ.", "ঘ." as keys. ONLY use "a", "b", "c", "d".
- ❌ Do **not** generate additional explanations or assumptions outside the revised answers.
- ❌ Do **not** include the question text in the output.
- ❌ Do **not** number or label the objects within the array.
- ❌ Do **not** wrap the output in backticks, Markdown, or any other format.
- ✅ Return **only the raw JSON array**, exactly as shown.
- ✅ Use proper LaTeX formatting for all math. Always use $...$ for inline math.
- ✅ Convert all fractions like "a/b" → "$\frac{a}{b}$".
- ✅ Convert all powers like "10^-5" → "$10^{-5}$".
- ✅ Convert all Greek letters (e.g., α → "$\alpha$", π → "$\pi$") using proper LaTeX syntax and escape with double backslashes (\).

`.trim(),
};

/**
 * Get prompt by key with validation
 * @param {string} key - Prompt key
 * @returns {string} Prompt text
 * @throws {Error} If prompt key doesn't exist
 */
export function getPrompt(key) {
  if (!PROMPTS[key]) {
    throw new Error(`Prompt with key '${key}' not found`);
  }
  return PROMPTS[key];
}

/**
 * Get all available prompt keys
 * @returns {Array<string>} Array of prompt keys
 */
export function getAvailablePrompts() {
  return Object.keys(PROMPTS);
}