import Subject from '../models/subject.model.js';
import { uploadImage } from '../utils/cloudinary.js';
import Topic from '../models/topic.model.js';
import mongoose from 'mongoose';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import embeddings from './aiEmbedding.service.js';
import SubjectEmbedding from '../models/subject.embedding.model.js';
import { cleanupFiles } from '../utils/file.utils.js';

export const getAllSubjects = async () => {
  try {
    const subjects = await Subject.find();
    return { success: true, data: subjects };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get single subject by ID
export const getSubjectById = async (id) => {
  try {
    const subject = await Subject.findById(id).populate({
      path: 'chapters.topics',
      model: 'Topic',
      select: 'englishName banglaName   type questionTypes images formulas aliases index segments'
    });
    
    if (!subject) {
      return { success: false, message: 'Subject not found' };
    }
    
    return { success: true, data: subject };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get subject topics by subject ID
export const getSubjectTopicsById = async (id) => {
  try {
    const subject = await Subject.findById(id, 'chapters englishName').populate({
      path: 'chapters.topics',
      model: 'Topic'
    });
    
    if (!subject) {
      return { success: false, message: 'Subject not found' };
    }
    
    // Flatten all topics from all chapters
    const allTopics = subject.chapters.reduce((topics, chapter) => {
      return [...topics, ...chapter.topics];
    }, []);
    
    return { 
      success: true, 
      data: {
        subjectId: subject._id,
        subjectName: subject.englishName,
        topics: allTopics
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get chapters with topics for a specific subject
export const getSubjectChaptersById = async (id) => {
  try {
    const subject = await Subject.findById(id, 'englishName banglaName chapters').populate({
      path: 'chapters.topics',
      model: 'Topic'
    });
    
    if (!subject) {
      return { success: false, message: 'Subject not found' };
    }
    
    return { 
      success: true,
      data: {
        subjectId: subject._id,
        subjectName: {
          english: subject.englishName,
          bangla: subject.banglaName
        },
        chapters: subject.chapters
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Add new subject
export const createSubject = async (subjectData) => {
  try {
    const newSubject = new Subject(subjectData);
    const savedSubject = await newSubject.save();
    return { success: true, data: savedSubject };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Edit subject
export const updateSubject = async (id, updateData) => {
  try {
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedSubject) {
      return { success: false, message: 'Subject not found' };
    }
    
    return { success: true, data: updatedSubject };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Delete subject
export const deleteSubject = async (id) => {
  try {
    // First delete all topics associated with this subject
    await Topic.deleteMany({ subjectId: id });
    
    const deletedSubject = await Subject.findByIdAndDelete(id);
    
    if (!deletedSubject) {
      return { success: false, message: 'Subject not found' };
    }
    
    return { success: true, data: deletedSubject };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Add chapter to subject
export const addChapterToSubject = async (id, chapterData) => {
  try {
    const { englishName, banglaName, index, topics } = chapterData;
    console.log(chapterData);
    
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { $push: { chapters: { englishName, banglaName, topics: topics || [], index } } },
      { new: true, runValidators: true }
    );
    
    if (!updatedSubject) {
      return { success: false, message: 'Subject not found' };
    }
    
    return { success: true, data: updatedSubject };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Add topic to specific chapter


// Remove topic from specific chapter
export const removeTopicFromChapter = async (id, chapterIndex, topicIndex) => {
  try {
    const subject = await Subject.findById(id);
    
    if (!subject) {
      return { success: false, message: 'Subject not found' };
    }
    
    if (!subject.chapters[chapterIndex]) {
      return { success: false, message: 'Chapter not found' };
    }
    
    if (!subject.chapters[chapterIndex].topics[topicIndex]) {
      return { success: false, message: 'Topic not found' };
    }
    
    const topicId = subject.chapters[chapterIndex].topics[topicIndex];
    
    // Delete the topic document
    await Topic.findByIdAndDelete(topicId);
    
    // Remove topic reference from chapter
    subject.chapters[chapterIndex].topics.splice(topicIndex, 1);
    await subject.save();
    
    return { success: true, data: subject };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Remove topic from chapter by name
export const removeTopicFromChapterByNames = async (id, chapterIndex, topicEnglishName) => {
  try {
    const subject = await Subject.findById(id).populate('chapters.topics');
    
    if (!subject) {
      return { success: false, message: 'Subject not found' };
    }
    
    if (!subject.chapters[chapterIndex]) {
      return { success: false, message: 'Chapter not found' };
    }
    
    // Find the topic to remove
    const topicToRemove = subject.chapters[chapterIndex].topics.find(
      topic => topic.englishName === topicEnglishName
    );
    
    if (!topicToRemove) {
      return { success: false, message: 'Topic not found' };
    }
    
    // Delete the topic document
    await Topic.findByIdAndDelete(topicToRemove._id);
    
    // Remove topic reference from chapter
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { $pull: { [`chapters.${chapterIndex}.topics`]: topicToRemove._id } },
      { new: true, runValidators: true }
    );
    
    return { success: true, data: updatedSubject };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get subjects by group and level
export const getSubjectsByGroupAndLevel = async (group, level) => {
  try {
    const filter = {};
    
    if (group) {
      filter.group = group;
    }
    
    if (level) {
      filter.level = level;
    }
    
    const subjects = await Subject.find(filter).populate({
      path: 'chapters.topics',
      model: 'Topic',
      select: 'englishName banglaName   type questionTypes images formulas aliases index segments uniqueKey'
    });
    
    return { 
      success: true, 
      data: subjects,
      count: subjects.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get subjects by level only
export const getSubjectsByLevel = async (level) => {
  try {
    const subjects = await Subject.find({ level });
    
    return { 
      success: true, 
      data: subjects,
      count: subjects.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get subjects by group only
export const getSubjectsByGroup = async (group) => {
  try {
    const subjects = await Subject.find({ group });
    
    return { 
      success: true, 
      data: subjects,
      count: subjects.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const removeChapterFromSubject = async (id, chapterId) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid Subject ID');
    }
    if (!mongoose.Types.ObjectId.isValid(chapterId)) {
      throw new Error('Invalid Chapter ID');
    }

    const subject = await Subject.findById(id);

    if (!subject) {
      throw new Error('Subject not found');
    }

    // Check if chapter exists in the chapters array
    const chapterIndex = subject.chapters.findIndex(chap => chap._id.toString() === chapterId);

    if (chapterIndex === -1) {
      throw new Error('Chapter not found in subject');
    }

    // Delete all topics in this chapter
    const topicsToDelete = subject.chapters[chapterIndex].topics;
    if (topicsToDelete && topicsToDelete.length > 0) {
      await Topic.deleteMany({ _id: { $in: topicsToDelete } });
    }

    // Remove the chapter by filtering it out
    subject.chapters.splice(chapterIndex, 1);

    // Save updated subject
    await subject.save();

    return { message: 'Chapter removed successfully' };

  } catch (error) {
    throw new Error(error.message || 'Failed to remove chapter');
  }
};

export const editTopic = async (subjectId, chapterIndex, topicIndex, data, files) => {
  // Start a transaction session
  const session = await mongoose.startSession();

  try {
    // Begin the transaction
    await session.startTransaction();

    let editableData = JSON.parse(data);

    const subject = await Subject.findById(subjectId).session(session);
    if (!subject) {
      throw new Error('Subject not found');
    }
    const chapter = subject.chapters[chapterIndex];
    if (!chapter) {
      throw new Error('Chapter not found');
    }
    if (!chapter.topics[topicIndex]) {
      throw new Error('Topic not found');
    }
    const topicId = chapter.topics[topicIndex];
    const topic = await Topic.findById(topicId).session(session);
    if (!topic) {
      throw new Error('Topic document not found');
    }

    // --- 1. DELETE existing embeddings for this topic ---
    // This happens first within the transaction.
    await SubjectEmbedding.deleteMany({ topicId: topic._id }, { session });


    // --- 2. UPDATE the Topic document with new data ---
    
    // Update text fields
    topic.englishName = editableData.englishName ?? topic.englishName;
    topic.banglaName = editableData.banglaName ?? topic.banglaName;
    // ... (add other fields you want to update)
    topic.questionTypes = editableData.questionTypes ?? topic.questionTypes;

    // IMPORTANT: Update segments directly
    if (editableData.segments) {
      topic.segments = editableData.segments;
    }
    
    // --- Image Handling ---
    // This logic updates the `topic` object in memory before it's saved.
    if (files && files.length > 0) {
        for (const image of files) {
            const imageMetaData = image.fieldname.split('_');
            const segmentIndex = imageMetaData[1];
            const imageIndex = imageMetaData[3];

            let imageTitleAndDescription = editableData.segments[segmentIndex]?.images[imageIndex];
            const newImage = await uploadImage(image);

            const imageData = {
                url: newImage?.data?.url,
                title: {
                    english: imageTitleAndDescription?.title?.english || "",
                    bangla: imageTitleAndDescription?.title?.bangla || ""
                },
                description: {
                    english: imageTitleAndDescription?.description?.english || "",
                    bangla: imageTitleAndDescription?.description?.bangla || ""
                }
            };

            if (topic.segments[segmentIndex]?.images) {
                topic.segments[segmentIndex].images[imageIndex] = imageData;
            }
        }
    }

    // Save the updated topic document within the transaction
    await topic.save({ session });

    // --- 3. CREATE new embeddings from the updated topic data ---
    const embeddingOperations = [];
    
    // Use the now-updated `topic` object as the source of truth
    for (const segment of topic.segments) {
      // Re-use the exact same embedding logic from `addTopicToChapter`
      const englishDataPoints = [
        subject.englishName,
        chapter.englishName,
        topic.englishName,
        topic.questionTypes?.map(q => q.english).join(" "),
        segment?.title?.english,
        segment?.description?.english,
        segment?.aliases?.english?.join(" "),
        segment?.aliases?.banglish?.join(' '),
        segment?.images?.map(img => `${img.title?.english} ${img.description?.english}`).join(" "),
        segment?.formulas?.map(f => `${f.equation} ${f.derivation?.english} ${f.explanation?.english}`).join(" ")
      ];
      const englishText = englishDataPoints.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

      const banglaDataPoints = [
        subject.banglaName,
        chapter.banglaName,
        topic.banglaName,
        topic.questionTypes?.map(q => q.bangla).join(" "),
        segment?.title?.bangla,
        segment?.description?.bangla,
        segment?.aliases?.bangla?.join(" "),
        segment?.aliases?.banglish?.join(' '),
        segment?.images?.map(img => `${img.title?.bangla} ${img.description?.bangla}`).join(" "),
        segment?.formulas?.map(f => `${f.equation} ${f.derivation?.bangla} ${f.explanation?.bangla}`).join(" ")
      ];
      const banglaText = banglaDataPoints.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      
      const [englishEmbed, banglaEmbed] = await Promise.all([
         embeddings.embedQuery(englishText),
         embeddings.embedQuery(banglaText)
      ]);
      
      if (!englishEmbed || !banglaEmbed) {
        throw new Error('Embedding re-generation failed for one or both languages.');
      }

      embeddingOperations.push(
        {
          subject: { englishName: subject.englishName, banglaName: subject.banglaName },
          chapter: { englishName: chapter.englishName, banglaName: chapter.banglaName },
          segmentUniqueKey: segment.uniqueKey,
          topicId: topic._id,
          chunkText: englishText,
          embedding: englishEmbed
        },
        {
          subject: { englishName: subject.englishName, banglaName: subject.banglaName },
          chapter: { englishName: chapter.englishName, banglaName: chapter.banglaName },
          topicId: topic._id,
          chunkText: banglaText,
          segmentUniqueKey: segment.uniqueKey,
          embedding: banglaEmbed
        }
      );
    }

    if (embeddingOperations.length > 0) {
      await SubjectEmbedding.create(embeddingOperations, { session });
    }

    // If everything is successful, commit the transaction
    await session.commitTransaction();
    
    // Fetch the final state outside the transaction for the response
    const updatedSubject = await Subject.findById(subjectId).populate('chapters.topics');
    
    return {
      success: true,
      message: 'Topic and its embeddings were updated successfully',
      data: updatedSubject
    };

  } catch (error) {
    // If any error occurs, abort the entire transaction
    await session.abortTransaction();
    console.error("Topic edit transaction failed:", error);
    return { success: false, error: error.message };
  } finally {
    // Always end the session
    await session.endSession();
    // Clean up uploaded files from the server's temp directory
    await cleanupFiles(files);
  }
};

export const addTopicToChapter = async (id, chapterIndex, topicData, files) => {
  const session = await mongoose.startSession();
  
  try {
    // Start transaction
    await session.startTransaction();

    const subject = await Subject.findById(id).session(session);

    if (!subject) {
      await session.abortTransaction();
      return { success: false, message: 'Subject not found' };
    }

    if (!subject.chapters[chapterIndex]) {
      await session.abortTransaction();
      return { success: false, message: 'Chapter not found' };
    }

    // Parse topicData
    let parsedData = typeof topicData === "string" ? JSON.parse(topicData) : topicData;
    console.log("parsed data", parsedData)
    const {
      englishName,
      banglaName,
      questionTypes,
      segments,
    } = parsedData;
    // Create new topic document
    const newTopic = new Topic({
      subjectId: id,
      chapterName: {
        bangla: subject.chapters[chapterIndex].banglaName,
        english: subject.chapters[chapterIndex].englishName,
        chapterId: subject.chapters[chapterIndex]._id
      },
      englishName,
      banglaName,
      questionTypes: questionTypes || [],
      segments: segments || []
    });

    // --- Image Handling ---
    if (files && files.length > 0) {
      for (const image of files) {
        try {
          const imageMetaData = image.fieldname.split('_');
          const segmentIndex = imageMetaData[1];
          const imageIndex = imageMetaData[3];

          let imageTitleAndDescription = parsedData.segments[segmentIndex]?.images[imageIndex];

          const newImage = await uploadImage(image);

          const imageData = {
            url: newImage?.data?.url,
            title: {
              english: imageTitleAndDescription?.title?.english || "",
              bangla: imageTitleAndDescription?.title?.bangla || ""
            },
            description: {
              english: imageTitleAndDescription?.description?.english || "",
              bangla: imageTitleAndDescription?.description?.bangla || ""
            }
          };

          if (newTopic.segments[segmentIndex]) {
            if (!newTopic.segments[segmentIndex].images) {
              newTopic.segments[segmentIndex].images = [];
            }
            if (newTopic.segments[segmentIndex].images[imageIndex]) {
              newTopic.segments[segmentIndex].images[imageIndex] = imageData;
            } else {
              newTopic.segments[segmentIndex].images.push(imageData);
            }
          }
        } catch (imageError) {
          console.error('Image upload failed:', imageError);
          await session.abortTransaction();
          return { success: false, error: `Image upload failed: ${imageError.message}` };
        }
      }
    }

    // Save the topic within transaction
    const savedTopic = await newTopic.save({ session });

    // Prepare all embedding data and operations first
    const embeddingOperations = [];
    
    for (const segment of segments) {
      try {
        // --- INLINED EMBEDDING LOGIC ---
        // Step 1: Construct the text chunks directly here from data only.
        const englishDataPoints = [
          subject.englishName,
          subject.chapters[chapterIndex].englishName,
          englishName,
          questionTypes?.map(q => q.english).join(" "),
          segment?.title?.english,
          segment?.description?.english,
          segment?.aliases?.english?.join(" "),
          segment?.aliases?.banglish?.join(' '),
          segment?.images?.map(img => `${img.title?.english} ${img.description?.english}`).join(" "),
          segment?.formulas?.map(f => `${f.equation} ${f.derivation?.english} ${f.explanation?.english}`).join(" ")
        ];
        const englishText = englishDataPoints.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

        const banglaDataPoints = [
          subject.banglaName,
          subject.chapters[chapterIndex].banglaName,
          banglaName,
          questionTypes?.map(q => q.bangla).join(" "),
          segment?.title?.bangla,
          segment?.description?.bangla,
          segment?.aliases?.bangla?.join(" "),
          segment?.aliases?.banglish?.join(' '),
          segment?.images?.map(img => `${img.title?.bangla} ${img.description?.bangla}`).join(" "),
          segment?.formulas?.map(f => `${f.equation} ${f.derivation?.bangla} ${f.explanation?.bangla}`).join(" ")
        ];
        const banglaText = banglaDataPoints.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
        
        // Step 2: Generate the embeddings directly from the text chunks.
        const [englishEmbed, banglaEmbed] = await Promise.all([
           embeddings.embedQuery(englishText),
           embeddings.embedQuery(banglaText)
        ]);
        
        if (!englishEmbed || !banglaEmbed) {
          throw new Error('Embedding generation failed for one or both languages.');
        }

        // Step 3: Prepare the embedding documents for batch creation.
        embeddingOperations.push(
          {
            subject: {
              englishName: subject.englishName,
              banglaName: subject.banglaName
            },
            chapter: {
              englishName: subject.chapters[chapterIndex].englishName,
              banglaName: subject.chapters[chapterIndex].banglaName
            },
            segmentUniqueKey: segment.uniqueKey,
            topicId: savedTopic._id,
            chunkText: englishText, // Use the generated text chunk
            embedding: englishEmbed // Use the generated embedding
          },
          {
            subject: {
              englishName: subject.englishName,
              banglaName: subject.banglaName
            },
            chapter: {
              englishName: subject.chapters[chapterIndex].englishName,
              banglaName: subject.chapters[chapterIndex].banglaName
            },
            topicId: savedTopic._id,
            chunkText: banglaText, // Use the generated text chunk
            segmentUniqueKey: segment.uniqueKey,
            embedding: banglaEmbed // Use the generated embedding
          }
        );

      } catch (embeddingError) {
        console.error('Embedding creation failed for segment:', segment, embeddingError);
        await session.abortTransaction();
        return { success: false, error: `Embedding creation failed: ${embeddingError.message}` };
      }
    }

    // Create all embeddings in batch within transaction
    if (embeddingOperations.length > 0) {
      await SubjectEmbedding.create(embeddingOperations, { session, ordered: true });
    }

    // Add topic reference to chapter within transaction
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { $push: { [`chapters.${chapterIndex}.topics`]: savedTopic._id } },
      { new: true, runValidators: true, session }
    ).populate('chapters.topics');

    // If everything succeeded, commit the transaction
    await session.commitTransaction();

    console.log('Topic and embeddings created successfully');
    return { success: true, data: updatedSubject };

  } catch (error) {
    // If any error occurs, abort the transaction
    console.error('Transaction failed:', error);
    await session.abortTransaction();
    return { success: false, error: error.message };
  } finally {
    // Always end the session
    await session.endSession();
    // Clean up uploaded files from the server's temp directory
    await cleanupFiles(files);
  }
};