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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
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
          images: z.array(
            z.object({
              caption: z.object({
                en: z.string().describe("English caption for the image."),
                bn: z.string().describe("Bangla caption for the image."),
              }).optional(),
            })
          ).optional().describe("Images within this section (AI extracts captions)."),
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
 * Performs OCR on images, then segments, summarizes, translates, and structures the text
 * into a detailed topic format using a single, efficient AI call.
 * @param {Array<Object>} images - Array of uploaded image files.
 * @returns {Promise<Object>} A promise resolving to the structured topic data.
 */
export const extractTopic = async (images) => {
  try {
    // 1. Define the LangChain model with structured output capabilities
    const llm = new ChatGoogleGenerativeAI({
      model: GEMINI_FLASH_MODEL,
      apiKey: GEMINI_API_KEY,
      temperature: 0,
    });
    const structuredLlm = llm.withStructuredOutput(extractedTopicSchema);
    
    // 2. Define Prompts
    const ocrPrompt = PromptTemplate.fromTemplate(
      `You are an OCR agent. Extract all text from the image(s). Format all mathematical expressions, symbols, and variables strictly in LaTeX (e.g., $F=ma$). Preserve the original text structure.`
    );

    const topicProcessingPrompt = PromptTemplate.fromTemplate(
      `You are an expert academic content processor for Bangladeshi HSC/SSC students.
      Based on the following OCR text, perform these actions to generate a complete Topic object:

      1.  **Overall Topic Information**:
          -   **Name**: Create a concise name for the entire topic in both English and Bangla.
          -   **Description**: Provide an overall description for the topic in both English and Bangla.
          -   **Aliases**: Generate at least 5 relevant search aliases (English, Bangla, Banglish), including both keyword-based and question-based queries.
          -   **Topic Number**: If identifiable, extract a topic number (e.g., "1.1").
          -   **Importance**: Assign an importance level ("HIGH", "MEDIUM", "LOW") based on the content's depth and relevance.
          -   **Tags**: Generate relevant keywords or tags.

      2.  **Articles**: Divide the content into logical articles. Each article should have:
          -   **Learning Outcomes**: List key learning outcomes in English and Bangla.
          -   **Body**: A general body text for the article.
          -   **Sections**: Further divide the article into logical sections. Each section should have:
              -   **Title**: A concise title in English and Bangla.
              -   **Body**: Detailed content for the section.
              -   **Images**: If images are present or implied by the text, extract a caption for them in English and Bangla. (Do NOT generate image URLs; only captions).
              -   **Formulas**: Extract any mathematical formulas. For each formula:
                  -   **Name**: English and Bangla name (if applicable).
                  -   **Equation**: The formula itself, strictly in LaTeX format (e.g., '$F=ma$').
                  -   **Description**: English and Bangla description.
                  -   **Derivation**: English and Bangla derivation (if available).
                  -   **Variables**: List each variable with its symbol, English/Bangla definition, and English/Bangla unit.

      3.  **Formatting**: Ensure ALL mathematical expressions, symbols, and variables are strictly in LaTeX ($...$).
      4.  **Output**: Your final output must be ONLY a valid JSON object conforming to the 'extractedTopicSchema'. Ensure all fields are present, using empty strings or arrays where no content is found.

      OCR Text: {ocr_text}`
    );

    // 3. Prepare Image Data for OCR
    const imageMessages = await Promise.all(
        images.map(async (image) => {
            const imageBuffer = await fs.readFile(image.path);
            return {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBuffer.toString("base64")}` },
            };
        })
    );
    
    // 4. Create and run the LangChain sequence
    const chain = RunnableSequence.from([
      {
        // Step 1: Perform OCR on the images
        ocr_text: async () => {
          const ocrMessage = new HumanMessage({
            content: [
              { type: "text", text: ocrPrompt.template },
              ...imageMessages,
            ],
          });
          const result = await llm.invoke([ocrMessage]);
          return result.content;
        },
      },
      // Step 2: Process the OCR text to get the final structured output
      topicProcessingPrompt,
      structuredLlm,
    ]);
    
    const result = await chain.invoke({});
      console.log(result)
    return { success: true, data: result };

  } catch (error) {
    console.error("Error in extractTopic:", error);
    throw error; // Re-throw for the controller to handle
  } finally {
      await cleanupFiles(images, true);
  }
};
