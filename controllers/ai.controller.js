
import { findSimilarDocsBySubjectChapterAndTopic, createEmbeddingsForSubjectsChaptersAndTopics , findSimilarDocsWithParsedContent,createEmbeddings } from "../services/aiRag.service.js";
import { extractTopic, extractArticle, extractQuestionsFromImages, extractAnswersFromImages, generateMetadata, translateText as serviceTranslateText } from '../services/aiService.js';
import { validateImageUpload, validateFileSizes, cleanupFiles } from "../utils/file.utils.js";
import embeddings from "../services/aiEmbedding.service.js";
import { uploadImage } from "../utils/cloudinary.js"; // Import uploadImage
export const createEmbedingsForSubjectsChaptersAndTopics = async (req, res) => {
try {
  
    const subject = req.body
    const result = await createEmbeddingsForSubjectsChaptersAndTopics(subject)

    res.json({
        success: true,
        result
    });

} catch (error) {
        console.error("Error in splitText:", error);
    
}
}

/**
 * Uploads a single image to Cloudinary and returns its URL.
 * @route POST /ai/upload-single-image
 */
export async function uploadSingleImage(req, res) {
  console.log("Processing single image upload request");
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No image file provided.",
    });
  }

  try {
    const uploadResult = await uploadImage(req.file.path);
    const imageUrl = uploadResult.data.url;
    console.log("Single image uploaded successfully:", imageUrl);

    await cleanupFiles([req.file]); // cleanupFiles expects an array

    return res.status(200).json({
      success: true,
      data: { url: imageUrl },
    });
  } catch (error) {
    console.error("Error during single image upload:", error);
    await cleanupFiles([req.file], true); // Attempt cleanup even on failure
    return res.status(500).json({
      success: false,
      message: "Failed to upload image. Please try again.",
    });
  }
}
export const getSimilarDocsBySubjectChapterAndTopic =async (req,res) =>{
 const result = await findSimilarDocsWithParsedContent(req.body.query, 10);

res.json({
    success: true,
    result

});
}
/**
 * Extract creative questions from uploaded images
 * @route POST /extract-questions
 */
export async function extractQuestions(req, res) {
  console.log("Processing question extraction request");
  const validation = validateImageUpload(req);
  console.log(validation)
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
    });
  }
 
  try {
    const { numBlocks, customInstructions } = req.body;
    const questions = await extractQuestionsFromImages(req.files.qb, { numBlocks, customInstructions });
    
    return res.status(200).json({
      success: true,
      data: questions,
      count: questions.length,
    });
  } catch (error) {
    console.error("Error extracting questions:", error);
    
    return res.status(500).json({
      success: false,
      message: "Failed to extract questions from images. Please try again.",
    });
  }
}

/**
 * Extract answers from uploaded images
 * @route POST /extract-answers
 */
export async function extractAnswers(req, res) {
  console.log("Processing answer extraction request");
  const validation = validateImageUpload(req);
  console.log(validation)
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
    });
  }
 console.log(true)
  try {
    const { numBlocks, customInstructions, partConfigs } = req.body;
    const answers = await extractAnswersFromImages(req.files.qb, { numBlocks, customInstructions, partConfigs });
    
    return res.status(200).json({
      success: true,
      data: answers,
    });
  } catch (error) {
    console.error("Error extracting answers:", error);
    
    return res.status(500).json({
      success: false,
      message: "Failed to extract answers from images. Please try again.",
    });
  }
}
export const extractTopicFromImage =async (req,res) =>{
const images = req.files.topic
const body = JSON.parse(req.body.aiControls)
const result = await extractTopic(images, body)
if(result.success === true){
    res.json({
        success: true,
        result
    });

}
if(result.success === false){
    res.json({
        success: false,
        message: "Failed to extract topic from images. Please try again."
    });

}
}
export const extractArticleFromImage = async (req,res) =>{
  const body = JSON.parse(req.body.aiControls)
  const images = req.files.article
  const result = await extractArticle(images, body)
  if(result.success === true){
    res.json({
        success: true,
        result
    });

}
if(result.success === false){
    res.json({
        success: false,
        message: "Failed to extract topic from images. Please try again."
    });

}
}
export const createEmbeddingsForTopicAndSegment = async (topic) => {
const { englishName, banglaName, questionTypes, segment, chapter ,subject} = topic;

console.log(questionTypes)
const englishSentence = `
      subject;${subject.englishName};
      Chapter: ${chapter.englishName};
      Topic: ${englishName};
      Question Types: ${questionTypes.map(q => q.english).join(", ")};
      Title: ${segment.title.english};
      Description: ${segment.description.english};
      Aliases: ${segment.aliases.english.join(", ") } ${segment.aliases.banglish.join(', ')};
      Images: ${segment.images.map(img => `Title: ${img.title.english}, Description: ${img.description.english}`).join(" | ")};
      Formulas: ${segment.formulas.map(f => `Equation: ${f.equation}, Derivation: ${f.derivation.english}, Explanation: ${f.explanation.english}`).join(" | ")}.
    `.replace(/\s+/g, " ").trim();

    const banglaSentence = `
      অধ্যায়: ${chapter.banglaName};
      বিষয়: ${banglaName};
      প্রশ্নের ধরণ: ${questionTypes.map(q => q.bangla).join(", ")};
      শিরোনাম: ${segment.title.bangla};
      বিবরণ: ${segment.description.bangla};
      সমার্থক শব্দ: ${segment.aliases.bangla.join(", ")} ${segment.aliases.banglish.join(', ')};
      ছবি: ${segment.images.map(img => `শিরোনাম: ${segment.title.bangla}, বিবরণ: ${segment.description.bangla}`).join(" | ")};
      সূত্র: ${segment.formulas.map(f => `সমীকরণ: ${f.equation}, উদ্ভব: ${f.derivation.bangla}, ব্যাখ্যা: ${f.explanation.bangla}`).join(" | ")}।
       ${subject.banglaName}
    `.replace(/\s+/g, " ").trim();

   
  
  const englishEmbed = await embeddings.embedQuery(englishSentence)
  const banglaEmbed = await embeddings.embedQuery(banglaSentence)
  return {embeddings:[englishEmbed,banglaEmbed], chunks:{english:englishSentence ,bangla:banglaSentence}}
}

/**
 * Translates text between English and Bangla.
 * @route POST /ai/translate
 */
export async function translateText(req, res) {
  try {
    const { text, targetLang } = req.body;

    if (!text || !targetLang) {
      return res.status(400).json({
        success: false,
        message: "Text and targetLang are required.",
      });
    }

    // Import dynamically to avoid circular dependency issues if any, though standard import is fine here.
    // Using the imported function from top of file if available, or importing here.
    // We need to make sure `translateText` is imported from aiService.js
    // I will add the import to the top of the file in a separate step or assume it's available if I update imports.
    // For now, I'll rely on updating the imports in the next step or previous step.
    // Wait, I haven't updated imports in ai.controller.js yet. I should do that.
    
    // Actually, I'll just use the service function. I need to update imports first.
    // Let's just add the function here and I'll update imports in a separate call or same call if I can.
    // Since I can't do multiple non-contiguous edits easily with replace_file_content, I'll do it in two steps.
    // This step adds the function.
    
    // Wait, I can't call the service function if I don't import it.
    // I'll assume I will update the import in the next step.
    
    const { translateText: serviceTranslateText } = await import("../services/aiService.js");

    const translatedText = await serviceTranslateText(text, targetLang);

    return res.status(200).json({
      success: true,
      data: { translatedText },
    });

  } catch (error) {
    console.error("Error in translateText controller:", error);
    return res.status(500).json({
      success: false,
      message: "Translation failed.",
    });
  }
}

/**
 * Generates metadata (aliases and tags) for a Creative Question.
 * @route POST /ai/generate-metadata
 */
export async function generateMetadataController(req, res) {
    try {
        const context = req.body;
        console.log("Received metadata generation request:", context);

        const metadata = await generateMetadata(context);

        return res.status(200).json({
            success: true,
            data: metadata,
        });

    } catch (error) {
        console.error("Error in generateMetadataController:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate metadata.",
        });
    }
}
