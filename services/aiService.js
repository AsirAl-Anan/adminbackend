import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import dotenv from "dotenv";
import { cleanupFiles, getMimeTypeFromPath } from "../utils/file.utils.js";
import { PROMPTS } from "../constants/prompts.js";

dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

/**
 * Clean and parse AI response to extract valid JSON
 * @param {string} text - Raw AI response text
 * @returns {Array|Object} Parsed JSON data or empty array on failure
 */
function cleanAndParseAIResponse(text) {
  if (!text || typeof text !== "string") {
    console.warn("cleanAndParseAIResponse received invalid input");
    return [];
  }

  console.log("Cleaning AI response...");

  // Remove markdown code block markers
  let cleaned = text
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    // First attempt: parse as-is
    const parsedOnce = JSON.parse(cleaned);
    
    // Handle double-encoded JSON
    if (typeof parsedOnce === "string") {
      return JSON.parse(parsedOnce);
    }
    
    return parsedOnce;
  } catch (error) {
    console.warn("First JSON parse failed:", error.message);
    
    // Second attempt: fix common escape issues
    try {
      const fixedText = fixEscapeSequences(cleaned);
      const parsedFixed = JSON.parse(fixedText);
      
      if (typeof parsedFixed === "string") {
        return JSON.parse(parsedFixed);
      }
      
      return parsedFixed;
    } catch (secondError) {
      console.error("Failed to parse AI response after fixes:", secondError.message);
      console.error("Problematic text:", cleaned);
      return [];
    }
  }
}

/**
 * Fix common escape sequence issues in AI-generated JSON
 * @param {string} text - Text with potential escape issues
 * @returns {string} Fixed text
 */
function fixEscapeSequences(text) {
  // Temporarily replace valid JSON escapes
  const validEscapes = {
    '\\\\': '__DOUBLE_BACKSLASH__',
    '\\"': '__QUOTE__',
    '\\/': '__FORWARD_SLASH__',
    '\\b': '__BACKSPACE__',
    '\\f': '__FORM_FEED__',
    '\\n': '__NEWLINE__',
    '\\r': '__CARRIAGE_RETURN__',
    '\\t': '__TAB__',
  };

  let tempText = text;
  
  // Replace valid escapes with placeholders
  Object.entries(validEscapes).forEach(([escapeSeq, placeholder]) => {
    const regex = new RegExp(escapeSeq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    tempText = tempText.replace(regex, placeholder);
  });

  // Fix problematic single backslashes followed by letters (e.g., \times -> \\times)
  tempText = tempText.replace(/(?<!\\)\\([a-zA-Z])/g, (match, letter) => {
    console.warn(`Fixing problematic escape sequence: ${match}`);
    return `\\\\${letter}`;
  });

  // Restore valid escapes
  Object.entries(validEscapes).forEach(([escapeSeq, placeholder]) => {
    tempText = tempText.split(placeholder).join(escapeSeq);
  });

  return tempText;
}

/**
 * Generate content using Gemini AI model
 * @param {Array} parts - Array of content parts (text and images)
 * @returns {Promise<string>} AI response text
 */
async function generateAIContent(parts) {
  try {
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: parts,
      }],
    });
    
    return result.response.text();
  } catch (error) {
    console.error("Error generating AI content:", error);
    throw new Error(`AI content generation failed: ${error.message}`);
  }
}

/**
 * Process image files and convert them to AI-compatible format
 * @param {Array} files - Array of uploaded files
 * @returns {Promise<Array>} Array of processed image parts
 */
async function processImageFiles(files) {
  const imageParts = [];

  for (const file of files) {
    try {
      const imageBuffer = await fs.readFile(file.path);
      const mimeType = getMimeTypeFromPath(file.path);
      const base64Data = imageBuffer.toString("base64");

      imageParts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    } catch (error) {
      console.error(`Error processing file ${file.path}:`, error);
      throw new Error(`Failed to process image file: ${file.originalname}`);
    }
  }

  return imageParts;
}

/**
 * Generic function to process images with AI
 * @param {Array} files - Array of uploaded files
 * @param {string} prompt - AI prompt to use
 * @returns {Promise<Array|Object>} Processed AI response
 */
async function processImagesWithAI(files, prompt) {
  try {
    // Process image files
    const imageParts = await processImageFiles(files);
    
    // Add prompt to parts
    const allParts = [...imageParts, { text: prompt }];
    
    // Generate AI content
    const aiResponse = await generateAIContent(allParts);
    
    // Clean and parse response
    const result = cleanAndParseAIResponse(aiResponse);
    
    return result;
  } catch (error) {
    console.error("Error in processImagesWithAI:", error);
    throw error;
  } finally {
    // Always clean up files
    await cleanupFiles(files, true);
  }
}

/**
 * Extract questions from uploaded images
 * @param {Array} files - Array of uploaded image files
 * @returns {Promise<Array>} Array of extracted questions
 */
export async function extractQuestionsFromImages(files) {
  console.log("Extracting questions from images...");
  
  const questions = await processImagesWithAI(files, PROMPTS.EXTRACT_QUESTIONS);
  
  if (!Array.isArray(questions)) {
    throw new Error("Invalid response format: expected array of questions");
  }
  
  console.log(`Successfully extracted ${questions.length} questions`);
  return questions;
}

/**
 * Extract answers from uploaded images
 * @param {Array} files - Array of uploaded image files
 * @returns {Promise<Array>} Array of extracted answers (English and Bangla)
 */
export async function extractAnswersFromImages(files) {
  console.log("Extracting answers from images...");
  
  const answers = await processImagesWithAI(files, PROMPTS.EXTRACT_ANSWERS);
  
  if (!Array.isArray(answers) || answers.length !== 2) {
    throw new Error("Invalid response format: expected array with English and Bangla answers");
  }
  
  console.log("Successfully extracted answers in both languages");
  return answers;
}

/**
 * Validate extracted questions format
 * @param {Array} questions - Array of question objects
 * @returns {boolean} True if format is valid
 */
export function validateQuestionsFormat(questions) {
  if (!Array.isArray(questions)) return false;
  
  return questions.every(question => 
    question &&
    typeof question === 'object' &&
    'stem' in question &&
    ('a' in question || 'ক' in question) // At least one option should exist
  );
}

/**
 * Validate extracted answers format
 * @param {Array} answers - Array of answer objects
 * @returns {boolean} True if format is valid
 */
export function validateAnswersFormat(answers) {
  if (!Array.isArray(answers) || answers.length !== 2) return false;
  
  return answers.every(answerSet =>
    answerSet &&
    typeof answerSet === 'object' &&
    ('aAnswer' in answerSet || 'bAnswer' in answerSet || 'cAnswer' in answerSet || 'dAnswer' in answerSet)
  );
}