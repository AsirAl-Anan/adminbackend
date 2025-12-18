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

// --- Zod Schemas ---

// Reusable schema factory for bilingual text
const createBilingualTextSchema = () => z.object({
  en: z.string().describe("English translation."),
  bn: z.string().describe("Bangla translation."),
});

// Reusable schema factory for content blocks (text + images)
const createContentBlockSchema = () => z.array(
  z.object({
    text: createBilingualTextSchema().optional(),
    images: z.array(
      z.object({
        url: z.string().describe("URL of the image (leave empty if not available yet)."),
        caption: z.object({
          english: z.string().optional(),
          bangla: z.string().optional(),
        }).optional(),
      })
    ).optional(),
    order: z.number().default(1),
  })
);

// Schema for a single question part (a, b, c, d)
const createQuestionPartSchema = () => z.object({
  question: createContentBlockSchema().describe("The question text and images."),
});

// Schema for the full Creative Question
const creativeQuestionSchema = z.object({
  stem: createContentBlockSchema().describe("The stem or stimulus scenario of the question."),
  a: createQuestionPartSchema().describe("Part A (Knowledge)"),
  b: createQuestionPartSchema().describe("Part B (Comprehension)"),
  c: createQuestionPartSchema().describe("Part C (Application)"),
  d: createQuestionPartSchema().describe("Part D (Higher Order Thinking)"),
});

// Schema for Answers
const createAnswerPartSchema = () => z.object({
  answer: createContentBlockSchema().describe("The answer content."),
});

const creativeQuestionAnswerSchema = z.object({
  a: createAnswerPartSchema().describe("Answer for Part A"),
  b: createAnswerPartSchema().describe("Answer for Part B"),
  c: createAnswerPartSchema().describe("Answer for Part C"),
  d: createAnswerPartSchema().describe("Answer for Part D"),
});


// --- Helper Functions ---

/**
 * Helper to create a LangChain model instance.
 */
const createModel = (structuredOutputSchema) => {
  const llm = new ChatGoogleGenerativeAI({
    model: GEMINI_FLASH_MODEL,
    apiKey: GEMINI_API_KEY,
    temperature: 0.1,
  });

  if (structuredOutputSchema) {
    return llm.withStructuredOutput(structuredOutputSchema);
  }
  return llm;
};

/**
 * Helper to prepare image messages for LangChain.
 */
const prepareImageMessages = async (images) => {
  return Promise.all(
    images.map(async (image) => {
      const imageBuffer = await fs.readFile(image.path);
      return {
        type: "image_url",
        image_url: { url: `data:${getMimeTypeFromPath(image.path)};base64,${imageBuffer.toString("base64")}` },
      };
    })
  );
};

// --- Exported Functions ---

/**
 * Extracts questions from uploaded images using LangChain and Gemini.
 * @param {Array<Object>} files - Array of uploaded image files.
 * @param {Object} options - Extraction options (numBlocks, customInstructions).
 * @returns {Promise<Object>} A promise that resolves to the extracted question object.
 */
export async function extractQuestionsFromImages(files, options = {}) {
  console.log("Extracting questions from images...", options);
  const { numBlocks, customInstructions } = options;

  try {
    const structuredLlm = createModel(creativeQuestionSchema);
    const imageMessages = await prepareImageMessages(files);

    let segmentationInstruction = "Organize content into logical blocks (paragraphs, math steps, verdict). Do NOT split single paragraphs into multiple blocks.";
    if (numBlocks && numBlocks > 0) {
      segmentationInstruction = `Organize the content into exactly ${numBlocks} logical blocks.`;
    }

    const ocrPrompt = PromptTemplate.fromTemplate(
      `You are an expert OCR and translation agent for Bangladeshi curriculum (NCTB). 
      1. Extract all text from the provided image(s) of a Creative Question (CQ).
      2. Identify the Stem and Parts A, B, C, and D.
      3. **Formatting Rules**:
         - Format all mathematical expressions, symbols, and variables strictly in LaTeX (e.g., $F=ma$).
         - Use proper LaTeX symbols for Greek alphabets (e.g., $\\alpha$, $\\beta$, $\\gamma$, $\\theta$, $\\pi$, $\\sigma$, $\\Delta$, $\\Omega$, etc.).
         - Use proper LaTeX for mathematical symbols (e.g., $\\infty$, $\\sum$, $\\int$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\leq$, $\\geq$, $\\neq$, $\\approx$, etc.).
         - Use newline characters (\\n) to separate paragraphs and create proper text formatting.
      4. Translate the content contextually:
         - If the source is Bangla, provide the English translation.
         - If the source is English, provide the Bangla translation.
         - Ensure translations are aligned with NCTB SSC/HSC standards.
      5. **Segmentation Rules**: ${segmentationInstruction}
      ${customInstructions ? `6. **User Instructions**: ${customInstructions}` : ""}
      7. Return the result strictly as a structured JSON object matching the schema.`
    );

    const chain = RunnableSequence.from([
      async () => {
        const msg = new HumanMessage({
          content: [
            { type: "text", text: ocrPrompt.template },
            ...imageMessages,
          ]
        });
        return [msg];
      },
      structuredLlm
    ]);

    console.log("Invoking AI chain for question extraction...");
    const result = await chain.invoke({});
    console.log("Question extraction complete.");

    return [result];

  } catch (error) {
    console.error("Error in extractQuestionsFromImages:", error);
    throw error;
  } finally {
    await cleanupFiles(files, true);
  }
}

/**
 * Helper to perform OCR and Translation (Step 1 of Pipeline).
 */
async function extractRawTextWithOCR(files, customInstructions) {
  const llm = createModel(); // Non-structured for raw text
  const imageMessages = await prepareImageMessages(files);

  const ocrPrompt = PromptTemplate.fromTemplate(
    `You are an expert OCR and translation agent for Bangladeshi curriculum (NCTB).
      1. Extract ALL text from the provided image(s).
      2. **Formatting Rules**:
         - Format all mathematical expressions, symbols, and variables strictly in LaTeX (e.g., $F=ma$).
         - Use proper LaTeX symbols for Greek alphabets (e.g., $\\alpha$, $\\beta$, $\\gamma$, $\\theta$, $\\pi$, $\\sigma$, $\\Delta$, $\\Omega$, etc.).
         - Use proper LaTeX for mathematical symbols (e.g., $\\infty$, $\\sum$, $\\int$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\leq$, $\\geq$, $\\neq$, $\\approx$, etc.).
         - Use newline characters (\\n) to separate paragraphs and create proper text formatting.
         - Preserve line breaks and paragraph structure from the original content.
      3. Translate the content contextually:
         - If the source is Bangla, provide the English translation.
         - If the source is English, provide the Bangla translation.
         - Ensure translations are aligned with NCTB SSC/HSC standards.
      4. Preserve the original flow and logical structure of the content.
      ${customInstructions ? `5. **User Instructions**: ${customInstructions}` : ""}
      
      Return the raw translated text. Do not attempt to structure it into JSON yet.`
  );

  const chain = RunnableSequence.from([
    async () => {
      const msg = new HumanMessage({
        content: [
          { type: "text", text: ocrPrompt.template },
          ...imageMessages,
        ]
      });
      return [msg];
    },
    llm,
    new StringOutputParser()
  ]);

  console.log("Invoking Step 1: OCR & Translation...");
  const result = await chain.invoke({});
  console.log("Step 1 Complete.");
  return result;
}

/**
 * Extracts answers from uploaded images using a two-step pipeline.
 * @param {Array<Object>} files - Array of uploaded image files.
 * @param {Object} options - Extraction options (partConfigs, customInstructions).
 * @returns {Promise<Object>} A promise that resolves to the extracted answer object.
 */
export async function extractAnswersFromImages(files, options = {}) {
  console.log("Extracting answers from images...", options);
  const { partConfigs, customInstructions } = options;

  // Parse partConfigs if it's a string (which it might be from FormData)
  let parsedConfigs = partConfigs;
  if (typeof partConfigs === 'string') {
    try {
      parsedConfigs = JSON.parse(partConfigs);
    } catch (e) {
      parsedConfigs = { a: 0, b: 0, c: 0, d: 0 };
    }
  } else if (!parsedConfigs) {
    parsedConfigs = { a: 0, b: 0, c: 0, d: 0 };
  }

  try {
    // Step 1: OCR and Translate
    const rawText = await extractRawTextWithOCR(files, customInstructions);

    // Step 2: Structure into JSON
    const structuredLlm = createModel(creativeQuestionAnswerSchema);

    let segmentationInstructions = `
      Segment the content into clear, meaningful blocks (paragraphs, math steps, verdict).
      Here are the generalised rules of blocks:
      The Srijonshil, or creative question system, implemented by the National Curriculum and Textbook Board (NCTB) of Bangladesh, is designed to assess a student's cognitive abilities beyond rote memorization. This system is structured around a stimulus (a passage, image, or scenario) followed by four distinct questions, labeled a, b, c, and d. Each of these parts targets a different level of thinking, based on Bloom's Taxonomy, and follows a specific paragraph-based structure for answering.
The Four Pillars of a Srijonshil Question: Rules and Structure
A complete Srijonshil question is worth 10 marks, distributed among its four parts. Success in this format hinges on understanding the specific requirements of each part.
Part A: Knowledge-Based (Gyanmulok - জ্ঞানমূলক)
Objective: To test the student's ability to recall information from the textbook.
Marks: 1
Answering Style: This question should be answered in a single sentence or even a single word. It requires a direct and concise response based on factual information from the prescribed text.
Para-Based System: A single, brief paragraph (one sentence) is sufficient.
Example Question: Who was the first president of Bangladesh?
Correct Answer: The first president of Bangladesh was Bangabandhu Sheikh Mujibur Rahman.
Part B: Comprehension-Based (Onudhabonmulok - অনুধাবনমূলক)
Objective: To assess the student's understanding of the concepts presented in the textbook. This involves explaining, defining, or summarizing a particular topic in their own words.
Marks: 2
Answering Style: The answer to this part should be structured into two paragraphs.
First Paragraph (Knowledge): This paragraph should provide the core, knowledge-based answer to the question in a single sentence.
Second Paragraph (Comprehension): This paragraph should elaborate on the first sentence, explaining the concept or statement. It demonstrates a deeper understanding of the subject matter.
Para-Based System: The answer is presented in two distinct paragraphs.
Example Question: Explain the significance of the 21st of February.
Answer:
The 21st of February holds immense significance as International Mother Language Day.[1]
This day is observed worldwide to promote awareness of linguistic and cultural diversity and to promote multilingualism. It commemorates the day in 1952 when students in Dhaka gave their lives for the recognition of the Bengali language.
Part C: Application-Based (Proyogmulok - প্রয়োগমূলক)
Objective: This part tests the student's ability to apply their learned knowledge and understanding to a new situation, which is typically presented in the stimulus. It requires the student to connect the stimulus with the concepts from their textbook.
Marks: 3
Answering Style: The answer for this part is ideally structured in three paragraphs.
First Paragraph (Knowledge): This paragraph should identify the concept from the textbook that is relevant to the stimulus.
Second Paragraph (Comprehension/Bridge): This paragraph should explain the identified concept, bridging the gap between the textbook knowledge and the scenario in the stimulus.
Third Paragraph (Application): This paragraph should explicitly show how the concept is applied to the situation described in the stimulus.
Para-Based System: A three-paragraph structure is recommended for a comprehensive answer.
Part D: Higher-Order Thinking Skills-Based (Uchchotor Dokkhotamulok - উচ্চতর দক্ষতামূলক)
Objective: This is the most advanced part of the Srijonshil question, designed to evaluate a student's ability to analyze, synthesize, evaluate, and create. It often requires forming a judgment, making a comparison, or providing a critical analysis of the situation in the stimulus in light of their textual knowledge.
Marks: 4
Answering Style: The answer to this question is best presented in four paragraphs.
First Paragraph (Knowledge): State the main theme or concept from the textbook that is reflected in the stimulus.
Second Paragraph (Comprehension): Explain the relevant concept from the textbook in more detail.
Third Paragraph (Application): Relate and apply the concept to the scenario presented in the stimulus, similar to the application part.
Fourth Paragraph (Evaluation/Analysis): This is the core of the higher-order thinking answer. Here, the student should provide their own analysis, evaluation, or judgment on the situation, often comparing or contrasting the stimulus with the broader themes of the textbook and offering a concluding statement.
Para-Based System: A four-paragraph structure allows for a thorough and well-reasoned response that addresses all facets of the question.
      **Specific Block Counts per Part:**
      `;

    ['a', 'b', 'c', 'd'].forEach(part => {
      const count = parsedConfigs[part];
      if (count > 0) {
        segmentationInstructions += `- Part ${part.toUpperCase()}: Exactly ${count} blocks.\n`;
      } else {
        segmentationInstructions += `- Part ${part.toUpperCase()}: Auto-detect logical blocks (do not over-segment).\n`;
      }
    });

    const structuringPrompt = PromptTemplate.fromTemplate(
      `You are an expert academic content structurer.
      Analyze the following text (which has been extracted from an image) and structure it into the required JSON format for a Creative Question Answer.

      **Input Text:**
      {rawText}

      **Instructions:**
      1. Identify answers for Parts A, B, C, and D from the text.
      2. **Segmentation Rules**: ${segmentationInstructions}
      3. **Formatting Requirements**:
         - Ensure all LaTeX math is preserved.
         - Use newline characters (\\n) to separate paragraphs within text blocks.
         - Maintain proper text formatting with line breaks where appropriate.
      4. Return the result strictly as a structured JSON object matching the schema.
      `
    );

    const chain = RunnableSequence.from([
      { rawText: () => rawText },
      structuringPrompt,
      structuredLlm
    ]);

    console.log("Invoking Step 2: Structuring...");
    const result = await chain.invoke({});
    console.log("Answer extraction complete.");

    return result;

  } catch (error) {
    console.error("Error in extractAnswersFromImages:", error);
    throw error;
  } finally {
    await cleanupFiles(files, true);
  }
}

/**
 * Dynamically creates a Zod schema for topic extraction based on user-defined exclusions.
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
 */
export const extractTopic = async (images, aiControls) => {
  console.log("ai controls", aiControls)

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

    const imageMessages = await prepareImageMessages(images);

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

  if (!excludedFields.includes('name')) {
    articleDefinition.name = z.object({
      en: z.string().describe("A concise and relevant title for the article in English."),
      bn: z.string().describe("A concise and relevant title for the article in Bangla."),
    });
  }

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
 */
export const extractArticle = async (images, aiControls) => {
  console.log("ai controls for article extraction", aiControls)

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

    const imageMessages = await prepareImageMessages(images);

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

/**
 * Translates text between English and Bangla with NCTB curriculum context.
 * @param {string} text - The text to translate.
 * @param {string} targetLang - The target language code ('en' or 'bn').
 * @returns {Promise<string>} The translated text.
 */
export const translateText = async (text, targetLang) => {
  try {
    const llm = new ChatGoogleGenerativeAI({
      model: GEMINI_FLASH_MODEL,
      apiKey: GEMINI_API_KEY,
      temperature: 0.1,
    });

    const prompt = PromptTemplate.fromTemplate(
      `You are an expert academic translator for the Bangladeshi NCTB curriculum (SSC/HSC level).
      
      Task: Translate the following text to {target_language}.
      
      Context & Guidelines:
      1. **Curriculum Alignment**: Use terms and terminologies consistent with NCTB textbooks.
      2. **Contextual Accuracy**: Ensure the translation fits the academic context (Physics, Chemistry, Math, etc.).
      3. **Formatting**: Preserve any LaTeX math formatting (e.g., $F=ma$) and special characters.
      4. **Tone**: Maintain a formal, academic tone.
      5. **Output**: Return ONLY the translated text. Do not add any explanations or notes.

      Text to translate:
      "{text}"`
    );

    const chain = RunnableSequence.from([
      prompt,
      llm,
      new StringOutputParser(),
    ]);

    const targetLanguageName = targetLang === 'en' ? 'English' : 'Bangla';

    console.log(`Translating to ${targetLanguageName}: "${text.substring(0, 50)}..."`);
    const result = await chain.invoke({
      target_language: targetLanguageName,
      text: text,
    });
    console.log("Translation complete.");

    return result.trim();

  } catch (error) {
    console.error("Error in translateText:", error);
    throw error;
  }
};

/**
 * Generates metadata (aliases and tags) for a Creative Question based on its context.
 * @param {Object} context - The context of the question (subject, board, year, etc.).
 * @returns {Promise<Object>} The generated metadata.
 */
export const generateMetadata = async (context) => {
  console.log("Generating metadata for context:", context);
  const { subject, board, year, level, group, examType, topic } = context;

  try {
    const metadataSchema = z.object({
      aliases: z.object({
        en: z.array(z.string()).describe("List of English aliases."),
        bn: z.array(z.string()).describe("List of Bangla aliases."),
        banglish: z.array(z.string()).describe("List of Banglish aliases."),
      }),
      tags: z.object({
        en: z.array(z.string()).describe("List of English tags."),
        bn: z.array(z.string()).describe("List of Bangla tags."),
      }),
    });

    const llm = createModel(metadataSchema);

    const prompt = PromptTemplate.fromTemplate(
      `You are an expert academic assistant for the Bangladeshi NCTB curriculum.
            Generate relevant aliases and tags for a Creative Question based on the following context:
            
            Subject: {subject}
            Board/Source: {board}
            Year: {year}
            Level: {level}
            Group: {group}
            Exam Type: {examType}
            Topic/Chapter: {topic}

            **Instructions:**
            1. **Aliases**: Generate search-friendly aliases.
               - Include combinations like "{board} Board {year}", "Question of {year}", "{subject} {year}", etc.
               - Provide them in English, Bangla, and Banglish (phonetic Bangla).
            2. **Tags**: Generate relevant keywords and tags related to the subject, chapter, and specific context.
               - Provide them in English and Bangla.
            3. **Output**: Return ONLY a valid JSON object matching the schema.
            `
    );

    const chain = RunnableSequence.from([
      prompt,
      llm
    ]);

    console.log("Invoking AI for metadata generation...");
    const result = await chain.invoke({
      subject: subject || "N/A",
      board: board || "N/A",
      year: year || "N/A",
      level: level || "N/A",
      group: group || "N/A",
      examType: examType || "",
      topic: topic || ""
    });
    console.log("Metadata generation complete.");

    return result;

  } catch (error) {
    console.error("Error in generateMetadata:", error);
    throw error;
  }
};

/**
 * Extracts specific metadata and content for bulk question ingestion.
 * @param {Array<Object>} files - Image files.
 * @param {Object} context - { year, subjectName }.
 */
export const extractBulkQuestion = async (files, context) => {
  console.log("Extracting bulk question with context:", context);
  const { year, subjectName } = context;

  try {
    // Define Schema for Bulk Extraction
    const bulkMetadataSchema = z.object({
      board: z.string().describe("The Board name extracted from the question text (e.g., 'Dhaka Board', 'Rajshahi Board'). If not found, return empty string."),
      partChapters: z.object({
        a: z.string().describe("Inferred chapter name for Part A based on the subject context."),
        b: z.string().describe("Inferred chapter name for Part B based on the subject context."),
        c: z.string().describe("Inferred chapter name for Part C based on the subject context."),
        d: z.string().describe("Inferred chapter name for Part D based on the subject context."),
      }),
      mainChapter: z.string().describe("The inferred main chapter name for the overall question."),
      aliases: z.object({
        en: z.array(z.string()).describe("Search aliases in English."),
        bn: z.array(z.string()).describe("Search aliases in Bangla."),
        banglish: z.array(z.string()).describe("Search aliases in Banglish."),
      }),
      tags: z.object({
        en: z.array(z.string()).describe("Related keywords/tags in English."),
        bn: z.array(z.string()).describe("Related keywords/tags in Bangla."),
      }),
    });

    const bulkPartSchema = z.object({
      question: createContentBlockSchema().describe("The question text."),
      answer: createContentBlockSchema().describe("The answer text (if extracted)."),
    });

    const bulkQuestionSchema = z.object({
      stem: createContentBlockSchema().describe("The stem or stimulus scenario of the question."),
      a: bulkPartSchema.describe("Part A (Knowledge)"),
      b: bulkPartSchema.describe("Part B (Comprehension)"),
      c: bulkPartSchema.describe("Part C (Application)"),
      d: bulkPartSchema.describe("Part D (Higher Order Thinking)"),
      extractedMetadata: bulkMetadataSchema,
    });

    const llm = createModel(bulkQuestionSchema);
    const imageMessages = await prepareImageMessages(files);

    const prompt = PromptTemplate.fromTemplate(
      `You are an expert OCR and academic classifier for Bangladeshi Curriculum (NCTB).
            
            **Context**:
            - Subject: {subjectName}
            - Year: {year}
            
            **Tasks**:
            1. **OCR & Extraction**: Extract the Creative Question (Stem, Parts A, B, C, D) from the image.
            2. **Translation**: For every text field (question text, answer text, etc.), provide BOTH:
               - 'en': English translation.
               - 'bn': Original Bangla text (or Bangla translation if original is English).
            3. **Metadata Extraction**:
               - Identify the **Education Board** (e.g., "Dhaka Board", "Dinajpur Board") from the text.
               - Infer the **Chapter Name** for EACH part (a, b, c, d) based on the provided Subject ({subjectName}) and the content of that part.
               - Infer the **Main Chapter** for the overall question.
               - Generate **Aliases** and **Tags**.
            
            **Formatting Rules**:
            - Format math strictly in LaTeX (e.g., $E=mc^2$).
            - Return strictly JSON matching the schema.
            `
    );

    const chain = RunnableSequence.from([
      async () => {
        const formattedPrompt = await prompt.format({ subjectName: subjectName || "General", year: year || new Date().getFullYear() });
        const msg = new HumanMessage({
          content: [
            { type: "text", text: formattedPrompt },
            ...imageMessages,
          ]
        });
        return [msg];
      },
      llm
    ]);

    console.log("Invoking AI for bulk extraction...");
    const result = await chain.invoke({});
    console.log("Bulk extraction complete.");
    return { success: true, data: result };

  } catch (error) {
    console.error("Error in extractBulkQuestion:", error);
    throw error;
  } finally {
    await cleanupFiles(files, true);
  }
};