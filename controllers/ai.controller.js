
import { findSimilarDocsBySubjectChapterAndTopic, createEmbeddingsForSubjectsChaptersAndTopics , findSimilarDocsWithParsedContent,createEmbeddings } from "../services/aiRag.service.js";
import {extractTopic} from '../services/aiService.js' 
import { validateImageUpload, validateFileSizes, cleanupFiles } from "../utils/file.utils.js";
import { extractQuestionsFromImages, extractAnswersFromImages } from "../services/aiService.js";
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
    const questions = await extractQuestionsFromImages(req.files.qb);
    
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
    const answers = await extractAnswersFromImages(req.files.qb);
    
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
console.log(images)
const result = await extractTopic(images)
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
