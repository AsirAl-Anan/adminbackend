
import { findSimilarDocsBySubjectChapterAndTopic, createEmbeddingsForSubjectsChaptersAndTopics , findSimilarDocsWithParsedContent} from "../services/aiRag.service.js";

export const createEmbedingsForSubjectsChaptersAndTopics = async (req, res) => {
try {
    console.log("body is :",req.body);
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
export const getSimilarDocsBySubjectChapterAndTopic =async (req,res) =>{
 const result = await findSimilarDocsWithParsedContent(req.body.query, 3);

res.json({
    success: true,
    result

});
}