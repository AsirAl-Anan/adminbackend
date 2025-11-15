import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import dotenv from "dotenv";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { cleanupFiles, getMimeTypeFromPath } from "../utils/file.utils.js";
import { PROMPTS } from "../constants/prompts.js";

dotenv.config();

// --- Constants ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in the environment variables.");
}

const GEMINI_FLASH_MODEL = "gemini-2.5-flash";
const GEMINI_FLASH_LITE_MODEL = "gemini-2.5-flash-lite";

// --- Zod Schemas ---
// Inlining all schemas to avoid $ref issues with Google Generative AI
export const extractedTopicSchema = z.object({
  name: z.object({
    en: z.string().describe("English name of the topic."),
    bn: z.string().describe("Bangla name of the topic."),
  }),
  description: z.object({
    en: z.string().describe("English description of the topic."),
    bn: z.string().describe("Bangla description of the topic."),
  }).optional(),
  aliases: z.object({
    english: z.array(z.string()).describe("Relevant search aliases in English."),
    bangla: z.array(z.string()).describe("Relevant search aliases in Bangla."),
    banglish: z.array(z.string()).describe("Relevant search aliases in Banglish (phonetic)."),
  }).optional(),
  topicNumber: z.string().optional().describe("The topic number (e.g., '1.1', 'Chapter 2, Topic 3')."),
  importance: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM").describe("Importance level of the topic."),
  tags: z.array(z.string()).optional().describe("Keywords or tags associated with the topic."),
  articles: z.array(
    z.object({
      learningOutcomes: z.object({
        en: z.array(z.string()).describe("English learning outcomes for the article."),
        bn: z.array(z.string()).describe("Bangla learning outcomes for the article."),
      }).optional(),
      body: z.object({
        en: z.string().describe("English body content of the article, can be Markdown/HTML."),
        bn: z.string().describe("Bangla body content of the article, can be Markdown/HTML."),
      }).optional(),
      sections: z.array(
        z.object({
          title: z.object({
            en: z.string().describe("English title of the section."),
            bn: z.string().describe("Bangla title of the section."),
          }),
          body: z.object({
            en: z.string().describe("English body content of the section, can be Markdown/HTML."),
            bn: z.string().describe("Bangla body content of the section, can be Markdown/HTML."),
          }).optional(),
         
          formulas: z.array(
            z.object({
              name: z.object({
                en: z.string().describe("English name of the formula."),
                bn: z.string().describe("Bangla name of the formula."),
              }).optional(),
              equation: z.string().describe("The mathematical formula or equation in LaTeX format (e.g., '$F=ma$')."),
              description: z.object({
                en: z.string().describe("English description of the formula."),
                bn: z.string().describe("Bangla description of the formula."),
              }).optional(),
              derivation: z.object({
                en: z.string().describe("English derivation of the formula, can be Markdown/HTML."),
                bn: z.string().describe("Bangla derivation of the formula, can be Markdown/HTML."),
              }).optional(),
              variables: z.array(
                z.object({
                  symbol: z.string().describe("The symbol of the variable (e.g., 'F', 'm', 'a')."),
                  definition: z.object({
                    en: z.string().describe("English definition of the variable."),
                    bn: z.string().describe("Bangla definition of the variable."),
                  }).optional(),
                  unit: z.object({
                    en: z.string().describe("English unit of the variable (e.g., 'meters/second')."),
                    bn: z.string().describe("Bangla unit of the variable."),
                  }).optional(),
                })
              ).optional().describe("List of variables used in the formula."),
            })
          ).optional().describe("Formulas relevant to this section."),
        })
      ).optional().describe("Sections within this article."),
      formulas: z.array(
        z.object({
          name: z.object({
            en: z.string().describe("English name of the formula."),
            bn: z.string().describe("Bangla name of the formula."),
          }).optional(),
          equation: z.string().describe("The mathematical formula or equation in LaTeX format (e.g., '$F=ma$')."),
          description: z.object({
            en: z.string().describe("English description of the formula."),
            bn: z.string().describe("Bangla description of the formula."),
          }).optional(),
          derivation: z.object({
            en: z.string().describe("English derivation of the formula, can be Markdown/HTML."),
            bn: z.string().describe("Bangla derivation of the formula, can be Markdown/HTML."),
          }).optional(),
          variables: z.array(
            z.object({
              symbol: z.string().describe("The symbol of the variable (e.g., 'F', 'm', 'a')."),
              definition: z.object({
                en: z.string().describe("English definition of the variable."),
                bn: z.string().describe("Bangla definition of the variable."),
              }).optional(),
              unit: z.object({
                en: z.string().describe("English unit of the variable (e.g., 'meters/second')."),
                bn: z.string().describe("Bangla unit of the variable."),
              }).optional(),
            })
          ).optional().describe("List of variables used in the formula."),
        })
      ).optional().describe("Master list of formulas for this article."),
    })
  ).describe("Array of articles within the topic."),
});


// --- Legacy Gemini AI Client (used for simpler tasks) ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const legacyModel = genAI.getGenerativeModel({ model: GEMINI_FLASH_MODEL });

// --- Helper Functions ---

/**
 * Clean and parse AI response to extract valid JSON.
 * @param {string} text - Raw AI response text.
 * @returns {Array|Object} Parsed JSON data or an empty array on failure.
 */
function cleanAndParseAIResponse(text) {
  if (!text || typeof text !== "string") {
    console.warn("cleanAndParseAIResponse received invalid input.");
    return [];
  }

  // Remove markdown code block markers and trim whitespace
  const cleaned = text
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    // Attempt to parse the cleaned text
    let parsedData = JSON.parse(cleaned);
    // Handle cases where the AI double-encodes JSON as a string
    if (typeof parsedData === "string") {
      parsedData = JSON.parse(parsedData);
    }
    return parsedData;
  } catch (error) {
    console.warn("Initial JSON parse failed. Attempting to fix and re-parse.", error.message);
    try {
      // Fix common escape sequence issues (e.g., unescaped backslashes in LaTeX)
      const fixedText = fixEscapeSequences(cleaned);
      let parsedData = JSON.parse(fixedText);
      if (typeof parsedData === "string") {
        parsedData = JSON.parse(parsedData);
      }
      return parsedData;
    } catch (secondError) {
      console.error("Failed to parse AI response even after fixes:", secondError.message);
      console.error("Problematic text:", cleaned);
      return [];
    }
  }
}

/**
 * Fix common escape sequence issues in AI-generated JSON, particularly for LaTeX.
 * @param {string} text - Text with potential escape issues.
 * @returns {string} Text with fixed escape sequences.
 */
function fixEscapeSequences(text) {
  // This regex finds single backslashes followed by a letter (common in LaTeX, e.g., \frac)
  // and replaces them with a double backslash to make it a valid JSON string escape.
  // The negative lookbehind `(?<!\\)` ensures we don't replace already escaped backslashes.
  return text.replace(/(?<!\\)\\([a-zA-Z])/g, "\\\\$1");
}

/**
 * Generate content using the legacy Gemini AI model.
 * @param {Array<Object>} parts - Array of content parts (text and images).
 * @returns {Promise<string>} AI response text.
 */
async function generateAIContent(parts) {
  try {
    const result = await legacyModel.generateContent({
      contents: [{ role: "user", parts }],
    });
    return result.response.text();
  } catch (error) {
    console.error("Error generating AI content:", error);
    throw new Error(`AI content generation failed: ${error.message}`);
  }
}

/**
 * Process image files and convert them to AI-compatible base64 format.
 * @param {Array<Object>} files - Array of uploaded file objects from a middleware like Multer.
 * @returns {Promise<Array<Object>>} Array of processed image parts for the AI model.
 */
async function processImageFiles(files) {
    return Promise.all(
        files.map(async (file) => {
            try {
                const imageBuffer = await fs.readFile(file.path);
                return {
                    inlineData: {
                        mimeType: getMimeTypeFromPath(file.path),
                        data: imageBuffer.toString("base64"),
                    },
                };
            } catch (error) {
                console.error(`Error processing file ${file.path}:`, error);
                throw new Error(`Failed to process image file: ${file.originalname}`);
            }
        })
    );
}

/**
 * A generic function to process images with the legacy AI model.
 * @param {Array<Object>} files - Array of uploaded files.
 * @param {string} prompt - The AI prompt to use.
 * @returns {Promise<Array|Object>} Processed and parsed AI response.
 */
async function processImagesWithAI(files, prompt) {
  try {
    const imageParts = await processImageFiles(files);
    const allParts = [...imageParts, { text: prompt }];
    const aiResponse = await generateAIContent(allParts);
    return cleanAndParseAIResponse(aiResponse);
  } catch (error) {
    console.error("Error in processImagesWithAI:", error);
    // Re-throw the error to be handled by the caller
    throw error;
  } finally {
    // Ensure temporary files are always cleaned up
    await cleanupFiles(files, true);
  }
}

// --- Exported Functions ---

/**
 * Extracts questions from uploaded images using a predefined prompt.
 * @param {Array<Object>} files - Array of uploaded image files.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of extracted questions.
 */
export async function extractQuestionsFromImages(files) {
  console.log("Extracting questions from images...");
  const questions = await processImagesWithAI(files, PROMPTS.EXTRACT_QUESTIONS);
  if (!Array.isArray(questions)) {
    throw new Error("Invalid response format: Expected an array of questions.");
  }
  console.log(`Successfully extracted ${questions.length} questions.`);
  return questions;
}

/**
 * Extracts answers from uploaded images using a predefined prompt.
 * @param {Array<Object>} files - Array of uploaded image files.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of extracted answers.
 */
export async function extractAnswersFromImages(files) {
  console.log("Extracting answers from images...");
  const answers = await processImagesWithAI(files, PROMPTS.EXTRACT_ANSWERS);
  if (!Array.isArray(answers) || answers.length !== 2) {
    throw new Error("Invalid response format: Expected an array with English and Bangla answers.");
  }
  console.log("Successfully extracted answers in both languages.");
  return answers;
}

/**
 * Validates the format of extracted questions.
 * @param {Array<Object>} questions - Array of question objects.
 * @returns {boolean} True if the format is valid, otherwise false.
 */
export function validateQuestionsFormat(questions) {
  if (!Array.isArray(questions)) return false;
  return questions.every(
    (q) =>
      q &&
      typeof q === "object" &&
      "stem" in q &&
      ("a" in q || "ক" in q) // Check for at least one option
  );
}

/**
 * Validates the format of extracted answers.
 * @param {Array<Object>} answers - Array of answer objects.
 * @returns {boolean} True if the format is valid, otherwise false.
 */
export function validateAnswersFormat(answers) {
  if (!Array.isArray(answers) || answers.length !== 2) return false;
  return answers.every(
    (set) =>
      set &&
      typeof set === "object" &&
      Object.keys(set).some(key => key.endsWith("Answer"))
  );
}


/**
 * Dynamically creates a Zod schema for topic extraction based on user-defined exclusions.
 * FIX: This function has been refactored to inline all schema definitions to avoid the "$ref" error
 * with the Google Generative AI API. Reusing schema constants causes this issue.
 * @param {string[]} [excludedFields=[]] - An array of field names to exclude from the schema.
 * @returns {z.ZodObject<any>} A dynamically constructed Zod schema.
 */
const createDynamicTopicSchema = (excludedFields = []) => {
    // Helper function to create the formula schema inline
    const createFormulaSchema = () => z.object({
        name: z.object({
            en: z.string().describe("The text in English."),
            bn: z.string().describe("The text in Bangla."),
        }).optional().describe("Name of the formula."),
        equation: z.string().describe("The mathematical formula or equation in LaTeX format (e.g., '$F=ma$')."),
        description: z.object({
            en: z.string().describe("The text in English."),
            bn: z.string().describe("The text in Bangla."),
        }).optional().describe("Description of the formula."),
        derivation: z.object({
            en: z.string().describe("The text in English."),
            bn: z.string().describe("The text in Bangla."),
        }).optional().describe("Derivation of the formula, can be Markdown/HTML."),
        variables: z.array(z.object({
            symbol: z.string().describe("The symbol of the variable (e.g., 'F', 'm', 'a')."),
            definition: z.object({
                en: z.string().describe("The text in English."),
                bn: z.string().describe("The text in Bangla."),
            }).optional().describe("Definition of the variable."),
            unit: z.object({
                en: z.string().describe("The text in English."),
                bn: z.string().describe("The text in Bangla."),
            }).optional().describe("Unit of the variable (e.g., 'meters/second').")
        })).optional().describe("List of variables used in the formula."),
    });

    const sectionDefinition = {
        title: z.object({
            en: z.string().describe("The text in English."),
            bn: z.string().describe("The text in Bangla."),
        }).describe("Title of the section."),
        body: z.object({
            en: z.string().describe("The text in English."),
            bn: z.string().describe("The text in Bangla."),
        }).optional().describe("Body content of the section, can be Markdown/HTML."),
    };
    if (!excludedFields.includes('formulas')) {
        sectionDefinition.formulas = z.array(createFormulaSchema()).optional().describe("Formulas relevant to this section.");
    }

    const articleDefinition = {
        body: z.object({
            en: z.string().describe("The text in English."),
            bn: z.string().describe("The text in Bangla."),
        }).optional().describe("General body content of the article, can be Markdown/HTML."),
        sections: z.array(z.object(sectionDefinition)).optional().describe("Sections within this article.")
    };
    if (!excludedFields.includes('learningOutcomes')) {
        articleDefinition.learningOutcomes = z.object({
            en: z.array(z.string()).describe("English learning outcomes for the article."),
            bn: z.array(z.string()).describe("Bangla learning outcomes for the article."),
        }).optional();
    }
    if (!excludedFields.includes('formulas')) {
        articleDefinition.formulas = z.array(createFormulaSchema()).optional().describe("Master list of formulas for this article.");
    }

    const topicDefinition = {};
    if (!excludedFields.includes('name')) {
        topicDefinition.name = z.object({
            en: z.string().describe("The text in English."),
            bn: z.string().describe("The text in Bangla."),
        }).describe("Name of the topic.");
    }
    if (!excludedFields.includes('description')) {
        topicDefinition.description = z.object({
            en: z.string().describe("The text in English."),
            bn: z.string().describe("The text in Bangla."),
        }).optional().describe("Description of the topic.");
    }
    if (!excludedFields.includes('aliases')) {
        topicDefinition.aliases = z.object({
            english: z.array(z.string()).describe("Relevant search aliases in English."),
            bangla: z.array(z.string()).describe("Relevant search aliases in Bangla."),
            banglish: z.array(z.string()).describe("Relevant search aliases in Banglish (phonetic)."),
        }).optional();
    }
    if (!excludedFields.includes('tags')) {
        topicDefinition.tags = z.array(z.string()).optional().describe("Keywords or tags associated with the topic.");
    }

    topicDefinition.articles = z.array(z.object(articleDefinition)).describe("Array of articles within the topic.");

    return z.object(topicDefinition);
};


/**
 * Dynamically creates a prompt template for topic extraction based on user controls.
 * @param {object} controls - The AI control object from the request.
 * @param {string[]} controls.excludedFields - Fields to exclude.
 * @param {string} controls.customInstruction - Custom instructions for the AI.
 * @param {object} controls.articles - Min/max article counts.
 * @param {object} controls.sections - Min/max section counts.
 * @returns {PromptTemplate} A dynamically constructed LangChain PromptTemplate.
 */
const createDynamicPromptTemplate = (controls) => {
    const { excludedFields, customInstruction, articles, sections } = controls;

    let baseInstructions = [
      "You are an expert academic content processor for Bangladeshi HSC/SSC students.",
      "Analyze the text extracted from the provided images and generate a structured JSON output.",
      "Ensure ALL mathematical expressions, symbols, and variables are strictly in LaTeX format (e.g., '$F=ma$').",
      "Your final output must be ONLY a valid JSON object conforming to the provided schema. Do not include any other text or markdown formatting around the JSON."
    ];

    let generationRules = [
        `**Content Generation Rules:**`,
        `1.  **Articles**: You MUST generate between ${articles.min} and ${articles.max} logical articles from the content.`,
        `2.  **Sections**: For EACH article, you MUST generate between ${sections.min} and ${sections.max} logical sections.`
    ];

    if (customInstruction) {
        generationRules.push(`3.  **Critical Custom Instruction**: You MUST strictly follow this high-priority instruction: "${customInstruction}"`);
    }

    const fieldInstructionMap = {
        name: "- **name**: Create a concise name for the entire topic in both English and Bangla.",
        description: "- **description**: Provide an overall summary description for the topic in both English and Bangla.",
        aliases: "- **aliases**: Generate relevant search aliases (English, Bangla, Banglish).",
        tags: "- **tags**: Generate relevant keywords or tags.",
        learningOutcomes: "- **learningOutcomes**: For each article, list the key learning outcomes in English and Bangla.",
        formulas: "- **formulas**: Extract all mathematical formulas. For each formula, provide its name, LaTeX equation, description, derivation (if present), and a list of all variables with their symbol, definition, and unit.",
    };

    let includedFieldInstructions = ["**JSON Field Instructions:**"];
    for (const field of Object.keys(fieldInstructionMap)) {
        if (!excludedFields.includes(field)) {
            includedFieldInstructions.push(fieldInstructionMap[field]);
        }
    }
    includedFieldInstructions.push("- **articles & sections**: Logically divide the content into articles and then further into sections, each with a bilingual title and body text.");

    const fullPrompt = [
        ...baseInstructions,
        ...generationRules,
        ...includedFieldInstructions,
        "\nHere is the OCR text:",
        "{ocr_text}"
    ].join("\n");

    return PromptTemplate.fromTemplate(fullPrompt);
};


/**
 * Performs OCR on images, then segments, summarizes, translates, and structures the text
 * into a detailed topic format based on dynamic user controls.
 * @param {Array<Object>} images - Array of uploaded image files.
 * @param {Object} aiControls - The user-defined controls for the AI.
 * @returns {Promise<Object>} A promise resolving to the structured topic data.
 */
export const extractTopic = async (images, aiControls) => {
  console.log("ai controls" ,aiControls)
  
  const controls = {
    excludedFields: aiControls?.excludedFields || [],
    customInstruction: aiControls?.customInstruction || "",
    articles: aiControls?.articles || { min: 1, max: 3 },
    sections: aiControls?.sections || { min: 2, max: 5 },
  };

  try {
    const dynamicSchema = createDynamicTopicSchema(controls.excludedFields);
    const dynamicPrompt = createDynamicPromptTemplate(controls);

    const llm = new ChatGoogleGenerativeAI({
      model: GEMINI_FLASH_MODEL,
      apiKey: GEMINI_API_KEY,
      temperature: 0.1,
    });
    const structuredLlm = llm.withStructuredOutput(dynamicSchema);

    const imageMessages = await Promise.all(
        images.map(async (image) => {
            const imageBuffer = await fs.readFile(image.path);
            return {
                type: "image_url",
                image_url: { url: `data:${getMimeTypeFromPath(image.path)};base64,${imageBuffer.toString("base64")}` },
            };
        })
    );
    
    const ocrPrompt = PromptTemplate.fromTemplate(
      `You are an OCR agent. Extract all text from the image(s). Format all mathematical expressions, symbols, and variables strictly in LaTeX (e.g., $F=ma$). Preserve the original text structure.`
    );

    const chain = RunnableSequence.from([
      {
        ocr_text: async () => {
          const ocrMessage = new HumanMessage({
            content: [
              { type: "text", text: ocrPrompt.template },
              ...imageMessages,
            ],
          });
          console.log("Invoking AI for OCR...");
          const result = await llm.invoke([ocrMessage]);
          console.log("OCR extraction complete.");
          return result.content;
        },
      },
      dynamicPrompt,
      structuredLlm,
    ]);
    
    console.log("Invoking main chain for topic structuring...");
    const result = await chain.invoke({});
    console.log("Topic structuring complete.");
      
    return { success: true, data: result };

  } catch (error) {
    console.error("Error in extractTopic:", error);
    if (error.message.includes('Failed to parse')) {
        throw new Error("The AI failed to generate a valid JSON structure. This might be due to overly complex content or a bug. Please try again or with different images.");
    }
    throw error;
  } finally {
      await cleanupFiles(images, true);
  }
};
/**
 * Dynamically creates a Zod schema for single article extraction.
 * This version includes 'name' and 'description' fields for the article.
 * @param {string[]} [excludedFields=[]] - An array of field names to exclude from the schema.
 * @returns {z.ZodObject<any>} A dynamically constructed Zod schema for a single article.
 */
const createDynamicArticleSchema = (excludedFields = []) => {
    // Helper function to create the formula schema inline to avoid $ref issues.
    const createFormulaSchema = () => z.object({
        name: z.object({
            en: z.string().describe("The text in English."),
            bn: z.string().describe("The text in Bangla."),
        }).optional().describe("Name of the formula."),
        equation: z.string().describe("The mathematical formula or equation in LaTeX format (e.g., '$F=ma$')."),
        description: z.object({
            en: z.string().describe("The text in English."),
            bn: z.string().describe("The text in Bangla."),
        }).optional().describe("Description of the formula."),
        derivation: z.object({
            en: z.string().describe("The text in English."),
            bn: z.string().describe("The text in Bangla."),
        }).optional().describe("Derivation of the formula, can be Markdown/HTML."),
        variables: z.array(z.object({
            symbol: z.string().describe("The symbol of the variable (e.g., 'F', 'm', 'a')."),
            definition: z.object({
                en: z.string().describe("The text in English."),
                bn: z.string().describe("The text in Bangla."),
            }).optional().describe("Definition of the variable."),
            unit: z.object({
                en: z.string().describe("The text in English."),
                bn: z.string().describe("The text in Bangla."),
            }).optional().describe("Unit of the variable (e.g., 'meters/second').")
        })).optional().describe("List of variables used in the formula."),
    });

    const sectionDefinition = {
        title: z.object({
            en: z.string().describe("The text in English."),
            bn: z.string().describe("The text in Bangla."),
        }).describe("Title of the section."),
        body: z.object({
            en: z.string().describe("The text in English."),
            bn: z.string().describe("The text in Bangla."),
        }).optional().describe("Body content of the section, can be Markdown/HTML."),
    };
    if (!excludedFields.includes('formulas')) {
        sectionDefinition.formulas = z.array(createFormulaSchema()).optional().describe("Formulas relevant to THIS SECTION ONLY.");
    }

    const articleDefinition = {};

    // --- ADDED NAME AND DESCRIPTION FIELDS ---
    if (!excludedFields.includes('name')) {
        articleDefinition.name = z.object({
            en: z.string().describe("A concise and relevant title for the article in English."),
            bn: z.string().describe("A concise and relevant title for the article in Bangla."),
        });
    }

  
    // --- END OF ADDED FIELDS ---

    if (!excludedFields.includes('learningOutcomes')) {
        articleDefinition.learningOutcomes = z.object({
            en: z.array(z.string()).describe("English learning outcomes for the article."),
            bn: z.array(z.string()).describe("Bangla learning outcomes for the article."),
        }).optional();
    }
    
    articleDefinition.body = z.object({
        en: z.string().describe("An introductory paragraph for the article, setting the stage for the sections."),
        bn: z.string().describe("An introductory paragraph for the article, setting the stage for the sections."),
    }).optional();

    articleDefinition.sections = z.array(z.object(sectionDefinition)).describe("An array of sections that make up the article.");

    return z.object(articleDefinition);
};


/**
 * Dynamically creates a prompt template for single article extraction.
 * This version instructs the AI to generate a 'name' and 'description'.
 * @param {object} controls - The AI control object from the request.
 * @returns {PromptTemplate} A dynamically constructed LangChain PromptTemplate.
 */
const createDynamicArticlePromptTemplate = (controls) => {
    const { excludedFields, customInstruction, sections } = controls;

    let baseInstructions = [
      "You are an expert academic content processor for Bangladeshi HSC/SSC students.",
      "Analyze the text from the provided images and generate a structured JSON output for a single, cohesive article.",
      "Ensure ALL mathematical expressions are strictly in LaTeX format (e.g., '$F=ma$').",
      "Your final output must be ONLY a valid JSON object. Do not include any other text or markdown."
    ];

    let generationRules = [
        `**Content Generation Rules:**`,
        `1.  **Sections**: You MUST logically divide the content into between ${sections.min} and ${sections.max} sections.`
    ];

    if (customInstruction) {
        generationRules.push(`2.  **Critical Custom Instruction**: You MUST strictly follow this high-priority instruction: "${customInstruction}"`);
    }

    // --- UPDATED FIELD INSTRUCTIONS ---
    let fieldInstructions = ["**JSON Field Instructions:**"];
    if (!excludedFields.includes('name')) {
        fieldInstructions.push("- **name**: FIRST, create a concise, descriptive title for the entire article in both English and Bangla.");
    }
    
    if (!excludedFields.includes('learningOutcomes')) {
        fieldInstructions.push("- **learningOutcomes**: List the key learning outcomes for the article.");
    }
    fieldInstructions.push("- **body**: Write an introductory paragraph that provides more detail than the description and sets the stage for the sections that follow.");
    fieldInstructions.push("- **sections**: Divide the main content into logical sections. Each section must have a bilingual `title` and `body`.");

    if (!excludedFields.includes('formulas')) {
        fieldInstructions.push("- **IMPORTANT**: Extract mathematical formulas and place them in the `formulas` array ONLY within the specific section where they are explained or used. If a section has no formulas, use an empty array `[]`.");
    }
    // --- END OF UPDATED INSTRUCTIONS ---

    const fullPrompt = [
        ...baseInstructions,
        ...generationRules,
        ...fieldInstructions,
        "\nHere is the OCR text:",
        "{ocr_text}"
    ].join("\n");

    return PromptTemplate.fromTemplate(fullPrompt);
};
/**
 * Performs OCR on images, then segments and structures the text
 * into a single detailed article format based on dynamic user controls.
 * @param {Array<Object>} images - Array of uploaded image files.
 * @param {Object} aiControls - The user-defined controls for the AI.
 * @returns {Promise<Object>} A promise resolving to the structured article data.
 */
export const extractArticle = async (images, aiControls) => {
  console.log("ai controls for article extraction" ,aiControls)
  
  const controls = {
    excludedFields: aiControls?.excludedFields || [],
    customInstruction: aiControls?.customInstruction || "",
    sections: aiControls?.sections || { min: 2, max: 8 }, // Default section count for a single article
  };

  try {
    const dynamicSchema = createDynamicArticleSchema(controls.excludedFields);
    const dynamicPrompt = createDynamicArticlePromptTemplate(controls);

    const llm = new ChatGoogleGenerativeAI({
      model: GEMINI_FLASH_MODEL,
      apiKey: GEMINI_API_KEY,
      temperature: 0.1,
    });
    const structuredLlm = llm.withStructuredOutput(dynamicSchema);

    const imageMessages = await Promise.all(
        images.map(async (image) => {
            const imageBuffer = await fs.readFile(image.path);
            return {
                type: "image_url",
                image_url: { url: `data:${getMimeTypeFromPath(image.path)};base64,${imageBuffer.toString("base64")}` },
            };
        })
    );
    
    const ocrPrompt = PromptTemplate.fromTemplate(
      `You are an OCR agent. Extract all text from the image(s). Format all mathematical expressions, symbols, and variables strictly in LaTeX (e.g., $F=ma$). Preserve the original text structure.`
    );

    const chain = RunnableSequence.from([
      {
        ocr_text: async () => {
          const ocrMessage = new HumanMessage({
            content: [
              { type: "text", text: ocrPrompt.template },
              ...imageMessages,
            ],
          });
          console.log("Invoking AI for OCR...");
          const result = await llm.invoke([ocrMessage]);
          console.log("OCR extraction complete.");
          return result.content;
        },
      },
      dynamicPrompt,
      structuredLlm,
    ]);
    
    console.log("Invoking main chain for article structuring...");
    const result = await chain.invoke({});
    console.log("Article structuring complete.");
      
    return { success: true, data: result };

  } catch (error) {
    console.error("Error in extractArticle:", error);
    if (error.message.includes('Failed to parse')) {
        throw new Error("The AI failed to generate a valid JSON structure. This might be due to overly complex content or a bug. Please try again or with different images.");
    }
    throw error;
  } finally {
      await cleanupFiles(images, true);
  }
};