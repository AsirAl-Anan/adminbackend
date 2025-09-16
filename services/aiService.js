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
const segmentSchema = z.array(
  z.object({
    title: z.object({
      english: z.string().describe("A concise, descriptive title for the segment in English."),
      bangla: z.string().describe("A concise, descriptive title for the segment in Bangla."),
    }),
    description: z.object({
      english: z.string().describe("A clear summary of the segment's content in English."),
      bangla: z.string().describe("A clear summary of the segment's content in Bangla."),
    }),
    formulas: z.object({
      equation: z.string().describe("The mathematical formula or equation in LaTeX format."),
      derivation: z.object({
        english: z.string().describe("A summary of the formula's derivation in English."),
        bangla: z.string().describe("A summary of the formula's derivation in Bangla."),
      }),
      explanation: z.object({
        english: z.string().describe("An explanation of the formula and its variables in English."),
        bangla: z.string().describe("An explanation of the formula and its variables in Bangla."),
      }),
    }),
    aliases: z.object({
      english: z.array(z.string()).describe("Relevant search aliases in English."),
      bangla: z.array(z.string()).describe("Relevant search aliases in Bangla."),
      banglish: z.array(z.string()).describe("Relevant search aliases in Banglish (phonetic)."),
    }),
  })
);

const imageDataSchema = z.object({
    title: z.object({
        english: z.string().describe("A concise title for the image in English."),
        bangla: z.string().describe("A concise title for the image in Bangla."),
    }),
    description: z.object({
        english: z.string().describe("A detailed description of the image in English."),
        bangla: z.string().describe("A detailed description of the image in Bangla."),
    }),
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
    const structuredLlm = llm.withStructuredOutput(segmentSchema);
    
    // 2. Define Prompts
    const ocrPrompt = PromptTemplate.fromTemplate(
      `You are an OCR agent. Extract all text from the image(s). Format all mathematical expressions, symbols, and variables strictly in LaTeX (e.g., $F=ma$). Preserve the original text structure.`
    );

    const topicProcessingPrompt = PromptTemplate.fromTemplate(
      `You are an expert academic content processor for Bangladeshi HSC/SSC students.
      Based on the following OCR text, perform these actions:
      1.  **Segment**: Divide the text into logical segments (concepts, definitions, laws).
          - **CRITICAL**: If a story is used to explain a concept, merge the lesson into the concept's description. Do not create a segment for the story itself.
      2.  **Summarize & Translate**: For each segment, create a concise title and description in both fluent English and natural-sounding Bangla.
      3.  **Formulas**: Extract any formulas, their derivations, and explanations into the designated fields. Use empty strings if none exist.
      4.  **Aliases**: Generate at least 5 relevant search aliases (English, Bangla, Banglish), including both keyword-based and question-based queries.
      5.  **Formatting**: Ensure ALL math is in LaTeX ($...$).
      Your final output must be ONLY the structured JSON requested.

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


/**
 * Analyzes a single image to generate a title and description in both English and Bangla.
 * This is optimized to use a single AI call for efficiency.
 * @param {Object} image - A single uploaded image file object.
 * @returns {Promise<Object>} A promise resolving to the structured image data.
 */
export const extractDataFromImage = async (image) => {
  try {
    // 1. Define the LangChain model with structured output
    const llm = new ChatGoogleGenerativeAI({
      model: GEMINI_FLASH_LITE_MODEL,
      apiKey: GEMINI_API_KEY,
      temperature: 0.2,
    });
    const structuredLlm = llm.withStructuredOutput(imageDataSchema);

    // 2. Create a single, comprehensive prompt
    const imageAnalysisPrompt = PromptTemplate.fromTemplate(
      `You are a skilled academic analyst for Bangladeshi HSC/SSC students. Your task is to analyze the given image and generate a structured JSON output with a title and description in both English and natural-sounding Bangla.

      STRICT RULES:
      - ALL mathematical symbols, formulas, and variables MUST be formatted using LaTeX (e.g., $v_0$, $F=ma$, $\\Delta t$).
      - The Bangla translation must be fluent and context-aware, not a literal translation.
      - Return ONLY a valid JSON object matching the requested schema.

      ANALYSIS:
      1. **Title**: Create a concise title that reflects the core idea of the image.
      2. **Description**: Explain the image's key elements, variables, and the main scientific principle it demonstrates.
      `
    );
    
    // 3. Prepare the image data
    const imageBuffer = await fs.readFile(image.path);
    const base64Data = imageBuffer.toString("base64");
    const messages = new HumanMessage({
        content: [
            { type: "text", text: imageAnalysisPrompt.template },
            { 
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Data}` }
            },
        ],
    });

    // 4. Create and run the chain
    const chain = RunnableSequence.from([
        () => messages, // Pass the prepared message to the model
        structuredLlm,
    ]);

    const result = await chain.invoke({});
    
    return { success: true, data: result };

  } catch (error) {
    console.error("Error in extractDataFromImage:", error);
    throw error; // Re-throw for centralized error handling
  } finally {
      await cleanupFiles([image], true);
  }
};