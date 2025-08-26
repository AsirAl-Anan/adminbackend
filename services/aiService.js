import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import dotenv from "dotenv";
import { cleanupFiles, getMimeTypeFromPath } from "../utils/file.utils.js";
import { PROMPTS } from "../constants/prompts.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { PromptTemplate, StructuredPrompt } from "@langchain/core/prompts";
import { RunnableSequence, RunnablePassthrough,RunnableMap } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import fileSystem from "fs";
import zod from "zod";
dotenv.config();
const segmentSchema = zod.array(
  zod.object({
  title: zod.object({
    english: zod.string(),
    bangla: zod.string(),
  }),

  description: zod.object({
    english: zod.string(),
    bangla: zod.string(),
  }),

  formulas: zod.object({
    equation: zod.string(),

    derivation: zod.object({
      english: zod.string(),
      bangla: zod.string(),
    }),

    explanation: zod.object({
      english: zod.string(),
      bangla: zod.string(),
    }),

   
  }),
   aliases: zod.object({
      english: zod.array(zod.string()),
      bangla: zod.array(zod.string()),
      banglish: zod.array(zod.string()),
    }),
})
)
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
      console.error(
        "Failed to parse AI response after fixes:",
        secondError.message
      );
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
    "\\\\": "__DOUBLE_BACKSLASH__",
    '\\"': "__QUOTE__",
    "\\/": "__FORWARD_SLASH__",
    "\\b": "__BACKSPACE__",
    "\\f": "__FORM_FEED__",
    "\\n": "__NEWLINE__",
    "\\r": "__CARRIAGE_RETURN__",
    "\\t": "__TAB__",
  };

  let tempText = text;

  // Replace valid escapes with placeholders
  Object.entries(validEscapes).forEach(([escapeSeq, placeholder]) => {
    const regex = new RegExp(
      escapeSeq.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "g"
    );
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
      contents: [
        {
          role: "user",
          parts: parts,
        },
      ],
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
    throw new Error(
      "Invalid response format: expected array with English and Bangla answers"
    );
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

  return questions.every(
    (question) =>
      question &&
      typeof question === "object" &&
      "stem" in question &&
      ("a" in question || "ক" in question) // At least one option should exist
  );
}

/**
 * Validate extracted answers format
 * @param {Array} answers - Array of answer objects
 * @returns {boolean} True if format is valid
 */
export function validateAnswersFormat(answers) {
  if (!Array.isArray(answers) || answers.length !== 2) return false;

  return answers.every(
    (answerSet) =>
      answerSet &&
      typeof answerSet === "object" &&
      ("aAnswer" in answerSet ||
        "bAnswer" in answerSet ||
        "cAnswer" in answerSet ||
        "dAnswer" in answerSet)
  );
}

export const extractTopic = async (images) => {
  try {
    const textExtractionTemplate = `
You are an OCR agent. Your job is to extract text from the image and strictly format all mathematical expressions in LaTeX.

STRICT LATEX RULES:
1. Every mathematical expression, symbol, or formula MUST be enclosed in $...$ delimiters. No exceptions.
   - Example: 4 × 10^-5 → $4 \\times 10^{-5}$
   - Example: πr^2 → $\\pi r^{2}$
2. Always convert Greek letters to LaTeX:
   - π → $\\pi$, μ → $\\mu$, α → $\\alpha$
3. Superscripts:
   - x^2 → $x^{2}$
   - 10^-5 → $10^{-5}$
4. Subscripts:
   - H2O → $H_{2}O$
   - aij → $a_{ij}$
5. Do not output plain text math. If it is math, it MUST be wrapped in $...$.
6. Keep all non-mathematical text as normal text (without $...$).
7. Do not add explanations, only return the extracted text with correct LaTeX formatting.
`;

    const llm = new ChatGoogleGenerativeAI({
      temperature: 0,
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
    });

    const ocrData = async (images) => {
      let imageData = [];
      for (const image of images) {
        const imageBuffer = await fs.readFile(image.path);
        const base64Data = imageBuffer.toString("base64");
        imageData.push(base64Data);
      }
      
      const content = [
        { type: "text", text: textExtractionTemplate },
        ...imageData.map((base64Image) => ({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${base64Image}` },
        })),
      ];
      
      const message = new HumanMessage({ content });
      const result = await llm.invoke([message]);
      return result.content;
    };

    const result = await ocrData(images);

    const translationTemplate = `
You are an expert translator and OCR formatting agent. Your job is to:

1. Translate the given English text into **natural, fluent Bengali** that feels human-written, not word-for-word.
2. Capture the **context and meaning** of the text, adjusting sentence structure where necessary for clarity in Bengali.
3. Detect titles, headings, or questions and format them in bold using Markdown. Example: **Title:** or **Question 1:**
4. Preserve the original structure of the text (paragraphs, lists, numbering).
5. Do not add explanations or commentary — only return the translated and formatted Bengali text.

Text: {text}
`;

const summarizeTemplate = `
You are an expert academic summarizer and concept tagger. Your task is to create concise, note-style summaries of academic texts and generate relevant search aliases.

Context:
1. You will be given text from the SSC and HSC syllabus in English.
2. Your audience is grade 9–12 students in a bilingual (English/Bangla) environment.

Segmentation Step (MUST DO FIRST):
- Divide the given paragraph into multiple **segments**.
- Each segment must be **segment-worthy**: 
   - It should represent a complete idea, concept, law, or definition. 
   - Do not create unnecessary or overly short segments.
- Each segment must consist of:
   - **Title** (if a heading is provided, use it; if not, create a short descriptive title).
   - **Description** (the content under that title).
- If the subject is **Biology or Chemistry**, each segment must hold **more detailed and comprehensive data**, since precision and completeness are critical in these subjects.

**SPECIAL INSTRUCTION: Handling Illustrative Stories & Scenarios**
This is the most critical rule. When you encounter a story, dialogue, or fictional scenario used to introduce a scientific concept, your segmentation logic must change.
1.  **Do NOT treat the story as its own segment.**
2.  **Identify the Core Lesson:** Read the story and understand the single scientific principle it is designed to teach.
3.  **Merge and Synthesize:** Create a **single segment** for the formal topic. In the description, use the lesson as a natural introduction.
4.  **Omit Story Details:** Do not mention characters or plot points; connection must be conceptual.

Instructions for Summarization:
1. Preserve Meaning: Do not change the meaning of the text.
2. Definitions: Keep definitions concise, 1–2 sentences.
3. Details & Descriptions: Summarize topic explanations without losing context.
4. Clarity: Prioritize readability and RAG retrieval.
5. Conciseness: Focus on core points.
6. Important order: Follow instructions strictly.
7. Include every equation. Use LaTeX.
8. Ensure correct topic relationships.
9. Include all key points.
10. Prioritize laws and theories.
11. Do not skip headings or paragraphs.
12. Do not describe figures/tables directly.
13. Use scientifically accurate terms.
14.Focus on the main parts to creat segments. Do not create unnecessary segments. Always try to fit similar topics into the same segment. But if something is different but is important,unique and have enough data in the paragraph create a unique segment for it

**Alias Generation (For Each Segment):**
- Generate three types of aliases: **english_alias**, **bangla_alias**, **banglish_alias**.

STRICT LATEX RULES:
1. Enclose every mathematical expression in $...$.
2. Convert Greek letters to LaTeX.
3. Use proper LaTeX for superscripts and subscripts.
4. Do not output plain text math.
5. Keep non-math text as normal.

Output:
- Segment text into **segment-worthy blocks**.
- Provide a **clear, concise summary** and aliases for each segment.
- For Biology and Chemistry, include detailed summaries.
- Maintain all academic info, including equations.

Numbered YAML-like format for segments:

1. 
title: |Segment Title|
description: |Segment Summary|
english_alias: |Keyword 1, Alternative phrase 2, Synonym 3|
bangla_alias: |কীওয়ার্ড ১, বিকল্প শব্দগুচ্ছ ২, প্রতিশব্দ ৩|
banglish_alias: |Keyword 1, Bikalpa Shobdoguchho 2, Protishobdo 3|

2.
title: |Segment Title 2|
description: |Segment Summary 2|
english_alias: |Keyword A, Keyword B|
bangla_alias: |কীওয়ার্ড এ, কীওয়ার্ড বি|
banglish_alias: |Keyword A, Keyword B|

…and so on for all segments.

Paragraph to be summarized: {paragraph}
`;


    const summarizePrompt = PromptTemplate.fromTemplate(summarizeTemplate);
    const translationPrompt = PromptTemplate.fromTemplate(translationTemplate);

    const translationChain = RunnableSequence.from([
      translationPrompt,
      llm,
      new StringOutputParser(),
    ]);

    const llm2 = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0
    });

    const segmentStructureTemplate = `
You are given two paragraphs: one in English and one in Bangla which containes several segments in each paragraph.

Your task is to analyze them and produce structured data that matches the schema provided by the system.
Important: you are working with notes, so do not edit them.
### Input Paragraphs:
English: {english_paragraph}
Bangla: {bangla_paragraph}

### Instructions:
- Use the English paragraph for all "english" fields.
- Use the Bangla paragraph for all "bangla" fields.
- If there is no formula in the text, set "equation" to "" and leave other formula fields as empty strings.
- For "banglish", create transliterations of the Bangla terms into English letters.
- Return only valid JSON that strictly follows the schema definition.
- Do no say any additional text, just do what is told.
`;

    const structuredLlm = llm2.withStructuredOutput(segmentSchema);
    const segmentStructurePrompt = StructuredPrompt.fromTemplate(segmentStructureTemplate);

    const summarizeChain = RunnableSequence.from([
      summarizePrompt,
      llm2,
      new StringOutputParser(),
    ]);

    const chain = RunnableSequence.from([
      RunnableMap.from({
        text: summarizeChain
      }),
      RunnableMap.from({
        // keep text AND add bangla_paragraph
        text: new RunnablePassthrough(),
        bangla_paragraph: translationChain
      }),
      RunnableMap.from({
        text: ({ bangla_paragraph, text }) =>
          RunnableSequence.from([
            segmentStructurePrompt,
            structuredLlm,
          ]).invoke({ english_paragraph: text, bangla_paragraph })
      })
    ]);

    const summarizedResult = await chain.invoke({ paragraph: result });

    return {
      success: true,
      data: {
        summarizedResult
      },
    };
  } catch (error) {
    console.error("Error in extractTopic:", error);
    throw error;
  }
};

export const extractDataFromImage = async(image)=>{
  try {
    const immageBuffer = await fs.readFile(image.path);
    const base64Data = immageBuffer.toString("base64");
    console.log(base64Data)
const message = new HumanMessage({
  content: [
    {
      type: "text",
      text: `You are a highly meritorious HSC/SSC student from Bangladesh, skilled at creating clear and insightful academic notes. 
Your task is to analyze an image (which may be a graph, scientific diagram, or figure) and generate both a precise title and a detailed description.  

STRICT RULES:
- Always format all mathematical symbols, formulas, and variables using LaTeX enclosed in $...$.  
  Example: $v_0$, $t_1$, $F = ma$, $\\theta$, $\\Delta t$.  
- Use Greek letters (α, β, θ, λ, etc.) when appropriate in physics, chemistry, or mathematics notation.  
- Do not mix plain text with math — if it’s a variable, write it in LaTeX.  

Instructions:  
1. **Title:**  
   - Provide a concise and meaningful title that reflects the core idea of the image.  
   - If it is a graph, mention what it represents (e.g., “Velocity vs Time Graph showing uniform acceleration between $t_1$ and $t_2$”).  
   - If it is a figure (e.g., forces, human heart), specify the objects/variables involved and their context.  

2. **Description:**  
   - Explain the image clearly, focusing on:  
     - Key elements, variables, and labels.  
     - Important points, states, or transitions.  
     - The main idea or conclusion the image is trying to convey.  
   - Keep the explanation structured and easy to understand, as if writing quality HSC/SSC notes.  

Examples:  
- If given a velocity vs time graph:  
  **Title:** Velocity vs Time graph showing uniform acceleration between $t_1$ and $t_2$.  
  **Description:** The graph starts at velocity $v_0$ at time $t_1$ and increases linearly with time, indicating constant acceleration. The slope of the graph represents acceleration $a$, and the area under the curve represents displacement $s$.  

- If given a figure of tension between two forces:  
  **Title:** Figure of tension acting between Object A and Object B ($T$).  
  **Description:** The figure shows Object A pulling Object B with a force $T$. Both objects experience equal and opposite tension forces. The main concept highlighted is Newton’s Third Law of Motion, which states that every action has an equal and opposite reaction.  

      `,
    },
    {
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${base64Data}`,
      },
    },
  ],
});
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash-lite",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.2
    })
    const translationTemplate = `
You are an academic translator whose job is to translate English academic notes into Bangla in a natural, human-like way.  
You must ensure that the translation reflects context and meaning, not just word-for-word translation.  
Your target audience is Bangladeshi HSC and SSC students, so the Bangla should feel like authentic class notes.  

Task:  
Take the given  **Title** and **Description** from the text and provide the output in  Bangla. 


Format:  
 
- Title: <write the Bangla translation of the title here>  
- Description: <write the Bangla translation of the description here>  

Rules:  
1. Translate in a **context-aware, natural style** that feels like proper HSC/SSC notes, not robotic word translation.  
2. Keep **scientific terms** (e.g., velocity, acceleration, force, current, heart, photosynthesis) in **English** inside Bangla sentences if that’s how they are commonly used in HSC/SSC textbooks.  
3. Use correct **scientific terminology** in Bangla (e.g., displacement → স্থানচ্যুতি, equilibrium → সাম্যাবস্থা).  
4. Always preserve **formulas, variables, units, and Greek letters** in LaTeX form (e.g., $v_0$, $a$, $\\theta$) in both languages without translation.  
5. Do not omit or shorten information — the Bangla and English descriptions must carry **the same depth and details**.  
6. The Bangla output must read like notes a good teacher would give: clear, fluent, and easy for students to grasp.  



The text you will need to translate: {english_paragraph}
`;
const str = new StringOutputParser();
  const getImageData =  await llm.pipe(str).invoke([message]) ;
    console.log("g",getImageData)
  const translationPrompt = PromptTemplate.fromTemplate(translationTemplate)
    const translationChain = RunnableSequence.from([
      translationPrompt,
      llm,
      new StringOutputParser(),
    
    ])

 
   const togetherDataTemplate = `
   your job is to gather english data and bangla data from the given inputs into the english title and description and bangla translate and description field
   english_paragrah: {english_paragraph}
   bangla_paragraph: {bangla_paragraph}
   `
   const togetherPrompt = PromptTemplate.fromTemplate(togetherDataTemplate)
   const structure = zod.object({
  title: zod.object({
    english: zod.string(),
    bangla: zod.string()
  })
  ,
  description: zod.object({
    english: zod.string(),
    bangla: zod.string()
  }),
  
  
   })
   const structuredLlm = llm.withStructuredOutput(structure)
   const togetherDataChain = RunnableSequence.from([
     togetherPrompt,
     structuredLlm
   ])
      const mainChain = RunnableSequence.from([
        {
          bangla_paragraph : translationChain,
          english_paragraph: new RunnablePassthrough()
        
        },
        togetherDataChain

      ])
    const res = await mainChain.invoke({
      english_paragraph: getImageData,
    
    })
    return res
  } catch (error) {
    return {success: false, error}
  }
}