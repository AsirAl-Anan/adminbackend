import mongoose from 'mongoose';
import Subject from '../models/subject.model.js';
import Topic from '../models/topic.model.js';
import SubjectEmbedding from '../models/subject.embedding.model.js';
import { uploadImage } from '../utils/cloudinary.js';
import { cleanupFiles } from '../utils/file.utils.js';
import embeddings from './aiEmbedding.service.js';
import { v4 as uuidv4 } from 'uuid';

// =================================================================================
// --- HELPER FUNCTIONS FOR DATA TRANSFORMATION ---
// These functions are the core of the refactor, handling the merge/split logic.
// =================================================================================

/**
 * Merges separate English and Bangla subject documents into a single object 
 * that matches the old API format. This makes the backend change invisible to the frontend.
 * @param {object} enDoc - The English subject Mongoose document.
 * @param {object} bnDoc - The Bangla subject Mongoose document.
 * @returns {object|null} A single, merged subject object, or null if input is invalid.
 */
const _mergeSubjectDocuments = (enDoc, bnDoc) => {
  if (!enDoc || !bnDoc) return enDoc || bnDoc || null;

  // Convert Mongoose documents to plain objects for manipulation
  const enObj = enDoc.toObject ? enDoc.toObject() : enDoc;
  const bnObj = bnDoc.toObject ? bnDoc.toObject() : bnDoc;

  const merged = {
    ...enObj,
    _id: enObj._id, // Present a consistent _id to the frontend
    englishName: enObj.name,
    banglaName: bnObj.name,
    chapters: enObj.chapters.map((enChapter, i) => {
      const bnChapter = bnObj.chapters[i] || { name: '', topics: [] };
      const mergedChapter = {
        ...enChapter,
        englishName: enChapter.name,
        banglaName: bnChapter.name,
      };
      delete mergedChapter.name; // Clean up new schema field

      // If topics are populated objects (not just ObjectIDs), they must also be merged.
      if (Array.isArray(enChapter.topics) && enChapter.topics.length > 0 && typeof enChapter.topics[0] === 'object') {
          mergedChapter.topics = enChapter.topics.map((enTopic, j) => {
              const bnTopic = bnChapter.topics?.[j] || {};
              return _mergeTopicDocuments(enTopic, bnTopic);
          });
      }
      return mergedChapter;
    })
  };

  // Clean up new schema fields from the top-level object
  delete merged.name;
  delete merged.version;
  return merged;
};

/**
 * Merges separate English and Bangla topic documents into the old single-object format.
 * @param {object} enTopic - The English topic document/object.
 * @param {object} bnTopic - The Bangla topic document/object.
 * @returns {object|null} A single, merged topic object, or null if input is invalid.
 */
const _mergeTopicDocuments = (enTopic, bnTopic) => {
  if (!enTopic) return null;
  const bnTopicSafe = bnTopic || {}; // Handle cases where a bangla version might be missing temporarily

  // Convert Mongoose documents to plain objects if they are not already
  const enObj = enTopic.toObject ? enTopic.toObject() : enTopic;
  const bnObj = bnTopicSafe.toObject ? bnTopicSafe.toObject() : bnTopicSafe;

  const merged = {
    ...enObj,
    _id: enObj._id,
    englishName: enObj.name,
    banglaName: bnObj.name,
    chapterName: {
      english: enObj.chapterName?.name,
      bangla: bnObj.chapterName?.name,
      chapterId: enObj.chapterName?.chapterId,
    },
    questionTypes: (enObj.questionTypes || []).map((q, i) => ({
      english: q.name,
      bangla: bnObj.questionTypes?.[i]?.name,
    })),
    segments: (enObj.segments || []).map((enSegment, i) => {
      const bnSegment = bnObj.segments?.[i] || {};
      return {
        ...enSegment,
        title: { english: enSegment.title, bangla: bnSegment.title },
        description: { english: enSegment.description, bangla: bnSegment.description },
        images: (enSegment.images || []).map((enImage, j) => {
            const bnImage = bnSegment.images?.[j] || {};
            return { ...enImage, title: { english: enImage.title, bangla: bnImage.title }, description: { english: enImage.description, bangla: bnImage.description }};
        }),
        formulas: (enSegment.formulas || []).map((enFormula, j) => {
            const bnFormula = bnSegment.formulas?.[j] || {};
            return { ...enFormula, derivation: { english: enFormula.derivation, bangla: bnFormula.derivation }, explanation: { english: enFormula.explanation, bangla: bnFormula.explanation }};
        }),
      };
    }),
  };

  delete merged.name;
  delete merged.version;
  return merged;
};

/**
 * Transforms incoming topic data from the old format into the new, language-specific format.
 * @param {object} data - The original topic data from the request.
 * @param {'english' | 'bangla'} version - The target language version.
 * @returns {object} The transformed data ready for the new schema.
 */
const _transformTopicData = (data, version) => {
  console.log("inside transform data", data)
  const lang = version;
  return {
    name: data[`${lang}Name`],
    type: data.type,
    questionTypes: (data.questionTypes || []).map(q => ({ name: q[lang] })),
    aliases: data.aliases,
    segments: (data.segments || []).map(seg => ({
      uniqueKey: seg.uniqueKey || uuidv4(),
      title: seg.title?.[lang],
      description: seg.description?.[lang],
      aliases: seg.aliases,
      images: (seg.images || []).map(img => ({ url: img.url, title: img.title?.[lang], description: img.description?.[lang] })),
      formulas: (seg.formulas || []).map(f => ({ equation: f.equation, derivation: f.derivation?.[lang], explanation: f.explanation?.[lang] })),
    })),
  };
};


/**
 * [NEW HELPER] Creates a comprehensive text chunk for embedding from various topic components.
 * This includes optional fields like formulas, images, and aliases.
 * @param {'english' | 'bangla'} language - The target language for the chunk text.
 * @param {object} subject - The subject document.
 * @param {object} chapter - The chapter object from the subject document.
 * @param {object} topic - The topic document.
 * @param {object} segment - The segment object from the topic document.
 * @returns {string} A formatted string ready for embedding.
 */
const _createEmbeddingChunkText = (language, subject, chapter, topic, segment) => {
    let textParts = [];

    if (language === 'english') {
        textParts.push(`The subject name is "${subject.name}", chapter name is "${chapter.name}", topic is "${topic.name}".`);
        textParts.push(`The segment is about "${segment.title}".`);
        if (segment.description) {
            textParts.push(`description: "${segment.description}".`);
        }
        if (segment.aliases?.english?.length > 0) {
            textParts.push(`Aliases for this are: "${segment.aliases.english.join(', ')}".`);
        }
        if (segment.formulas?.length > 0) {
            const formulasText = segment.formulas.map(f => {
                let formulaString = `Equation: ${f.equation || 'N/A'}`;
                if (f.derivation) formulaString += `, Derivation: ${f.derivation}`;
                if (f.explanation) formulaString += `, Explanation: ${f.explanation}`;
                return formulaString;
            }).join('; ');
            textParts.push(`related formulas are: "${formulasText}".`);
        }
        if (segment.images?.length > 0) {
            const imagesText = segment.images.map(img => {
                let imageString = `Image available at ${img.url}`;
                if (img.description) imageString += ` described as: ${img.description}`;
                return imageString;
            }).join('; ');
            textParts.push(`related images are: "${imagesText}".`);
        }
    } else { // Bangla
        textParts.push(`বিষয়টির নাম "${subject.name}", অধ্যায়ের নাম "${chapter.name}", টপিকটি হলো "${topic.name}"।`);
        textParts.push(`সেগমেন্টটি "${segment.title}" সম্পর্কে।`);
        if (segment.description) {
            textParts.push(`বর্ণনা: "${segment.description}"।`);
        }
        if (segment.aliases?.bangla?.length > 0) {
            textParts.push(`এর অন্যান্য নামগুলো হলো: "${segment.aliases.bangla.join(', ')}"।`);
        }
        if (segment.formulas?.length > 0) {
            const formulasText = segment.formulas.map(f => {
                let formulaString = `সমীকরণ: ${f.equation || 'N/A'}`;
                if (f.derivation) formulaString += `, প্রতিপাদন: ${f.derivation}`;
                if (f.explanation) formulaString += `, ব্যাখ্যা: ${f.explanation}`;
                return formulaString;
            }).join('; ');
            textParts.push(`সম্পর্কিত সূত্রগুলো হলো: "${formulasText}"।`);
        }
        if (segment.images?.length > 0) {
            const imagesText = segment.images.map(img => {
                let imageString = `ছবিটি ${img.url} এ পাওয়া যাবে`;
                if (img.description) imageString += `, যার বর্ণনা: ${img.description}`;
                return imageString;
            }).join('; ');
            textParts.push(`সম্পর্কিত ছবিগুলো হলো: "${imagesText}"।`);
        }
    }

    return textParts.join(' ').trim();
};


// =================================================================================
// --- REFACTORED SERVICE FUNCTIONS ---
// =================================================================================

export const getAllSubjects = async () => {
  try {
    const allDocs = await Subject.find().sort({ createdAt: 1 });
    const groupedByLinkingId = allDocs.reduce((acc, doc) => {
      if (!acc[doc.linkingId]) acc[doc.linkingId] = {};
      acc[doc.linkingId][doc.version] = doc;
      return acc;
    }, {});
    const mergedSubjects = Object.values(groupedByLinkingId)
      .map(group => _mergeSubjectDocuments(group.english, group.bangla))
      .filter(Boolean); // Filter out any incomplete pairs
    return { success: true, data: mergedSubjects };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getSubjectById = async (id) => {
  try {
    const doc = await Subject.findById(id);
    if (!doc) return { success: false, message: 'Subject not found' };

    const docs = await Subject.find({ linkingId: doc.linkingId })
      .populate({ path: 'chapters.topics', model: 'Topic' });
    
    const enDoc = docs.find(d => d.version === 'english');
    const bnDoc = docs.find(d => d.version === 'bangla');
    if (!enDoc || !bnDoc) return { success: false, message: 'Subject language pair is incomplete.' };

    const mergedSubject = _mergeSubjectDocuments(enDoc, bnDoc);
    return { success: true, data: mergedSubject };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper function to populate and merge subjects for multiple read operations
const _findAndMergeSubjects = async (filter) => {
    const allDocs = await Subject.find(filter).populate({ path: 'chapters.topics', model: 'Topic' });
    const grouped = allDocs.reduce((acc, doc) => {
        if (!acc[doc.linkingId]) acc[doc.linkingId] = {};
        acc[doc.linkingId][doc.version] = doc;
        return acc;
    }, {});
    const merged = Object.values(grouped)
        .map(group => _mergeSubjectDocuments(group.english, group.bangla))
        .filter(Boolean);
    return { success: true, data: merged, count: merged.length };
};


export const getSubjectsByGroupAndLevel = async (group, level) => {
  try {
    const filter = {};
    if (group) filter.group = group;
    if (level) filter.level = level;
    return await _findAndMergeSubjects(filter);
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createSubject = async (subjectData) => {
  try {
    const linkingId =await uuidv4();
    const commonData = { ...subjectData };
    delete commonData.englishName;
    delete commonData.banglaName;
    delete commonData.chapters;

    const englishDocData = { ...commonData, linkingId, version: 'english', name: subjectData.englishName, chapters: (subjectData.chapters || []).map(ch => ({ name: ch.englishName, aliases: ch.aliases, topics: ch.topics || [] })) };
    const banglaDocData = { ...commonData, linkingId, version: 'bangla', name: subjectData.banglaName, chapters: (subjectData.chapters || []).map(ch => ({ name: ch.banglaName, aliases: ch.aliases, topics: ch.topics || [] })) };

    const [savedEnDoc, savedBnDoc] = await Subject.create([englishDocData, banglaDocData]);
    const mergedSubject = _mergeSubjectDocuments(savedEnDoc, savedBnDoc);
    
    return { success: true, data: mergedSubject };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateSubject = async (id, updateData) => {
  try {
    const doc = await Subject.findById(id);
    if (!doc) return { success: false, message: 'Subject not found' };

    const commonData = { ...updateData };
    delete commonData.englishName;
    delete commonData.banglaName;
    delete commonData.chapters;

    const englishUpdate = { ...commonData, name: updateData.englishName, chapters: (updateData.chapters || []).map(ch => ({ ...ch, name: ch.englishName, englishName: undefined, banglaName: undefined })) };
    const banglaUpdate = { ...commonData, name: updateData.banglaName, chapters: (updateData.chapters || []).map(ch => ({ ...ch, name: ch.banglaName, englishName: undefined, banglaName: undefined })) };

    await Subject.updateOne({ linkingId: doc.linkingId, version: 'english' }, englishUpdate, { runValidators: true });
    await Subject.updateOne({ linkingId: doc.linkingId, version: 'bangla' }, banglaUpdate, { runValidators: true });

    return await getSubjectById(id); // Fetch and return merged result
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteSubject = async (id) => {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const doc = await Subject.findById(id).session(session);
    if (!doc) throw new Error('Subject not found');

    const subjects = await Subject.find({ linkingId: doc.linkingId }).session(session);
    const allTopicIds = subjects.flatMap(s => s.chapters.flatMap(c => c.topics));
    
    if (allTopicIds.length > 0) {
      await Topic.deleteMany({ _id: { $in: allTopicIds } }).session(session); // Hooks on Topic model will handle embedding deletion
    }
    await Subject.deleteMany({ linkingId: doc.linkingId }).session(session);

    await session.commitTransaction();
    return { success: true, message: 'Subject and all associated topics deleted successfully.' };
  } catch (error) {
    await session.abortTransaction();
    return { success: false, error: error.message };
  } finally {
    await session.endSession();
  }
};

export const addTopicToChapter = async (id, chapterIndex, topicData, files) => {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const subjectDoc = await Subject.findById(id).session(session);
    if (!subjectDoc) throw new Error('Subject not found');

    const subjects = await Subject.find({ linkingId: subjectDoc.linkingId }).session(session);
    const enSubject = subjects.find(s => s.version === 'english');
    const bnSubject = subjects.find(s => s.version === 'bangla');
    if (!enSubject || !bnSubject) throw new Error('Incomplete subject language pair found.');

    const enChapter = enSubject.chapters[chapterIndex];
    const bnChapter = bnSubject.chapters[chapterIndex];
    if (!enChapter || !bnChapter) throw new Error('Chapter not found at the specified index.');
       
    const parsedData = typeof topicData === "string" ? JSON.parse(topicData) : topicData;
    const topicLinkingId = new mongoose.Types.ObjectId().toString();

    const englishTopicPayload = _transformTopicData(parsedData, 'english');
    const banglaTopicPayload = _transformTopicData(parsedData, 'bangla');
    
    englishTopicPayload.linkingId = topicLinkingId;
    englishTopicPayload.version = 'english';
    englishTopicPayload.subjectId = enSubject._id;
    englishTopicPayload.chapterName = { name: enChapter.name, chapterId: enChapter._id };

    banglaTopicPayload.linkingId = topicLinkingId;
    banglaTopicPayload.version = 'bangla';
    banglaTopicPayload.subjectId = bnSubject._id;
    banglaTopicPayload.chapterName = { name: bnChapter.name, chapterId: bnChapter._id };

    if (files && files.length > 0) {
        for (const image of files) {
            const [_, segmentIndex, __, imageIndex] = image.fieldname.split('_');
            const newImage = await uploadImage(image);
            if(newImage?.data?.url) {
              if (englishTopicPayload.segments[segmentIndex]?.images[imageIndex]) englishTopicPayload.segments[segmentIndex].images[imageIndex].url = newImage.data.url;
              if (banglaTopicPayload.segments[segmentIndex]?.images[imageIndex]) banglaTopicPayload.segments[segmentIndex].images[imageIndex].url = newImage.data.url;
            }
        }
    }

    const [savedEnTopic, savedBnTopic] = await Topic.create([englishTopicPayload, banglaTopicPayload], { session , ordered: true });
    
    const embeddingOperations = [];
    // UPDATED: Loop through the transformed payloads to create embeddings
    for (let i = 0; i < englishTopicPayload.segments.length; i++) {
        const enSegment = englishTopicPayload.segments[i];
        const bnSegment = banglaTopicPayload.segments[i];

        const englishText = _createEmbeddingChunkText('english', enSubject, enChapter, savedEnTopic, enSegment);
        const banglaText = _createEmbeddingChunkText('bangla', bnSubject, bnChapter, savedBnTopic, bnSegment);
       
        const [englishEmbed, banglaEmbed] = await Promise.all([embeddings.embedQuery(englishText), embeddings.embedQuery(banglaText)]);
        if (!englishEmbed || !banglaEmbed) throw new Error('Embedding generation failed.');
          
        embeddingOperations.push(
          {
            subject: { 
              englishName: enSubject.name, 
              banglaName: bnSubject.name 
            },
            otherData: JSON.stringify({
              chapter: { 
                englishName: enChapter.name, 
                banglaName: bnChapter.name 
              },
              segmentUniqueKey: enSegment.uniqueKey,
              topicId: savedEnTopic._id
            }),
            chunkText: englishText,
            embedding: englishEmbed
          },
          { 
            subject: { 
              englishName: enSubject.name, 
              banglaName: bnSubject.name 
            }, 
            otherData: JSON.stringify({ 
              chapter: { 
                englishName: enChapter.name, 
                banglaName: bnChapter.name 
              }, 
              topicId: savedBnTopic._id, 
              segmentUniqueKey: bnSegment.uniqueKey,
            }), 
            chunkText: banglaText, 
            embedding: banglaEmbed 
          }
        );
    }
    if (embeddingOperations.length > 0) await SubjectEmbedding.create(embeddingOperations, { session , ordered: true });

    enSubject.chapters[chapterIndex].topics.push(savedEnTopic._id);
    bnSubject.chapters[chapterIndex].topics.push(savedBnTopic._id);
    await enSubject.save({ session });
    await bnSubject.save({ session });

    await session.commitTransaction();
    return await getSubjectById(id);
  } catch (error) {
    await session.abortTransaction();
    console.error('Add Topic Transaction failed:', error);
    return { success: false, error: error.message };
  } finally {
    await session.endSession();
    await cleanupFiles(files);
  }
};

export const editTopic = async (subjectId, chapterIndex, topicIndex, data, files) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();
    const baseSubject = await Subject.findById(subjectId).session(session);
    if (!baseSubject) throw new Error('Subject not found');
    const subjects = await Subject.find({ linkingId: baseSubject.linkingId }).session(session);
    const enSubject = subjects.find(s => s.version === 'english');
    const bnSubject = subjects.find(s => s.version === 'bangla');
    if (!enSubject || !bnSubject) throw new Error('Subject language pair is incomplete');

    const enTopicId = enSubject.chapters[chapterIndex]?.topics[topicIndex];
    const bnTopicId = bnSubject.chapters[chapterIndex]?.topics[topicIndex];
    if (!enTopicId || !bnTopicId) throw new Error('Topic not found at specified index');

    // Delete old embeddings. The new ones will be created from the updated data.
    await SubjectEmbedding.deleteMany({ 
        'otherData.topicId': { $in: [enTopicId, bnTopicId] } // A more robust way to query if topicId is inside the JSON string
    }, { session });

    const parsedData = JSON.parse(data);
    const englishUpdatePayload = _transformTopicData(parsedData, 'english');
    const banglaUpdatePayload = _transformTopicData(parsedData, 'bangla');
   console.log(englishUpdatePayload, banglaUpdatePayload);
    if (files && files.length > 0) {
      for (const image of files) {
          const [_, segmentIndex, __, imageIndex] = image.fieldname.split('_');
          const newImage = await uploadImage(image);
          if (newImage?.data?.url) {
              if (englishUpdatePayload.segments[segmentIndex]?.images[imageIndex]) englishUpdatePayload.segments[segmentIndex].images[imageIndex].url = newImage.data.url;
              if (banglaUpdatePayload.segments[segmentIndex]?.images[imageIndex]) banglaUpdatePayload.segments[segmentIndex].images[imageIndex].url = newImage.data.url;
          }
      }
    }

    const updatedEnTopic = await Topic.findByIdAndUpdate(enTopicId, englishUpdatePayload, { session, new: true, runValidators: true });
    const updatedBnTopic = await Topic.findByIdAndUpdate(bnTopicId, banglaUpdatePayload, { session, new: true, runValidators: true });
    if (!updatedEnTopic || !updatedBnTopic) throw new Error('Failed to update one or both topic documents.');

    const embeddingOperations = [];
    for (let i = 0; i < updatedEnTopic.segments.length; i++) {
      console.log("true", updatedEnTopic.segments[i], updatedBnTopic.segments[i])
        const enSegment = updatedEnTopic.segments[i];
        const bnSegment = updatedBnTopic.segments[i];
        const enChapter = enSubject.chapters[chapterIndex];
        const bnChapter = bnSubject.chapters[chapterIndex];
      console.log(" unique key:,",enSegment)
        // UPDATED: Use the new helper function for comprehensive chunk text
        const englishText = _createEmbeddingChunkText('english', enSubject, enChapter, updatedEnTopic, enSegment);
        const banglaText = _createEmbeddingChunkText('bangla', bnSubject, bnChapter, updatedBnTopic, bnSegment);
        
        const [englishEmbed, banglaEmbed] = await Promise.all([embeddings.embedQuery(englishText), embeddings.embedQuery(banglaText)]);
        if (!englishEmbed || !banglaEmbed) throw new Error('Embedding re-generation failed.');

        embeddingOperations.push(
            {
                subject: { 
                  englishName: enSubject.name, 
                  banglaName: bnSubject.name 
                },
                otherData: JSON.stringify({
                  chapter: { 
                    englishName: enChapter.name, 
                    banglaName: bnChapter.name 
                  },
                  segmentUniqueKey: enSegment.uniqueKey,
                  topicId: updatedEnTopic._id
                }),
                chunkText: englishText,
                embedding: englishEmbed
            },
            { 
                subject: { 
                  englishName: enSubject.name, 
                  banglaName: bnSubject.name 
                }, 
                otherData: JSON.stringify({ 
                  chapter: { 
                    englishName: enChapter.name, 
                    banglaName: bnChapter.name 
                  }, 
                  topicId: updatedBnTopic._id, 
                  segmentUniqueKey: bnSegment.uniqueKey
                }), 
                chunkText: banglaText, 
                embedding: banglaEmbed 
            }
        );
    }
    if (embeddingOperations.length > 0) {
        await SubjectEmbedding.create(embeddingOperations, { session , ordered: true });
    }

    await session.commitTransaction();
    return await getSubjectById(subjectId);
  } catch (error) {
    await session.abortTransaction();
    console.error("Topic edit transaction failed:", error);
    return { success: false, error: error.message };
  } finally {
    await session.endSession();
    await cleanupFiles(files);
  }
};


export const removeChapterFromSubject = async (id, chapterId) => {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const subjectDoc = await Subject.findById(id).session(session);
    if (!subjectDoc) throw new Error('Subject not found');

    const subjects = await Subject.find({ linkingId: subjectDoc.linkingId }).session(session);
    const enSubject = subjects.find(s => s.version === 'english');
    const bnSubject = subjects.find(s => s.version === 'bangla');
    if (!enSubject || !bnSubject) throw new Error('Subject pair not found');

    const chapterIndex = enSubject.chapters.findIndex(chap => chap._id.toString() === chapterId);
    if (chapterIndex === -1) throw new Error('Chapter not found in subject');

    const enTopicsToDelete = enSubject.chapters[chapterIndex].topics;
    const bnTopicsToDelete = bnSubject.chapters[chapterIndex].topics;
    const allTopicsToDelete = [...new Set([...enTopicsToDelete, ...bnTopicsToDelete])]; // Combine and unique

    if (allTopicsToDelete.length > 0) {
      await Topic.deleteMany({ _id: { $in: allTopicsToDelete } }).session(session);
    }

    enSubject.chapters.splice(chapterIndex, 1);
    bnSubject.chapters.splice(chapterIndex, 1);
    await enSubject.save({ session });
    await bnSubject.save({ session });

    await session.commitTransaction();
    return { success: true, message: 'Chapter removed successfully' };
  } catch (error) {
    await session.abortTransaction();
    return { success: false, error: error.message };
  } finally {
    await session.endSession();
  }
};


export const removeTopicFromChapter = async (id, chapterIndex, topicIndex) => {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const subjectDoc = await Subject.findById(id).session(session);
    if (!subjectDoc) {
      throw new Error('Subject not found');
    }

    const subjects = await Subject.find({ linkingId: subjectDoc.linkingId }).session(session);
    const enSubject = subjects.find(s => s.version === 'english');
    const bnSubject = subjects.find(s => s.version === 'bangla');

    if (!enSubject || !bnSubject) {
      throw new Error('Subject language pair not found');
    }

    const enChapter = enSubject.chapters[chapterIndex];
    const bnChapter = bnSubject.chapters[chapterIndex];

    if (!enChapter || !bnChapter) {
      throw new Error('Chapter not found at the specified index');
    }

    const enTopicId = enChapter.topics[topicIndex];
    const bnTopicId = bnChapter.topics[topicIndex];

    if (!enTopicId || !bnTopicId) {
      throw new Error('Topic not found at the specified index');
    }

    const allTopicIdsToDelete = [enTopicId, bnTopicId];

    await Topic.deleteMany({ _id: { $in: allTopicIdsToDelete } }).session(session);

    enSubject.chapters[chapterIndex].topics.splice(topicIndex, 1);
    bnSubject.chapters[chapterIndex].topics.splice(topicIndex, 1);

    await enSubject.save({ session });
    await bnSubject.save({ session });

    await session.commitTransaction();

    return { success: true, message: 'Topic and its embeddings removed successfully.' };
  } catch (error) {
    await session.abortTransaction();
    console.error("Remove Topic Transaction failed:", error);
    return { success: false, error: error.message };
  } finally {
    await session.endSession();
  }
};
// --- Untouched/Simple functions that still work or were not provided ---
export const getSubjectTopicsById = async (id) => {
    const result = await getSubjectById(id);
    if (!result.success) return result;
    const subject = result.data;
    const allTopics = subject.chapters.reduce((topics, chapter) => [...topics, ...chapter.topics], []);
    return { success: true, data: { subjectId: subject._id, subjectName: subject.englishName, topics: allTopics } };
};

export const getSubjectChaptersById = async (id) => {
    const result = await getSubjectById(id);
    if (!result.success) return result;
    const subject = result.data;
    return { success: true, data: { subjectId: subject._id, subjectName: { english: subject.englishName, bangla: subject.banglaName }, chapters: subject.chapters } };
};

export const getSubjectsByLevel = async (level) => await _findAndMergeSubjects({ level });
export const getSubjectsByGroup = async (group) => await _findAndMergeSubjects({ group });
export const recreateAllTopicEmbeddings = async () => {
  console.log("--- Starting Full Re-creation of Topic Embeddings ---");
  let stats = {
    subjectsProcessed: 0,
    topicsProcessed: 0,
    embeddingsCreated: 0,
    warnings: [],
  };

  try {
    console.log("Step 1/5: Deleting all existing topic embeddings...");
    const { deletedCount } = await SubjectEmbedding.deleteMany({});
    console.log(`Deletion complete. Removed ${deletedCount} old embeddings.`);

    console.log("Step 2/5: Fetching all subjects with populated topics...");
    const allDocs = await Subject.find({}).populate({
      path: 'chapters.topics',
      model: 'Topic'
    });
    if (allDocs.length === 0) {
      console.log("No subjects found in the database. Exiting.");
      return { success: true, message: "No subjects found to process.", data: stats };
    }
    console.log(`Found ${allDocs.length} total subject documents.`);

    console.log("Step 3/5: Grouping subjects by language pairs...");
    const groupedSubjects = allDocs.reduce((acc, doc) => {
      if (!acc[doc.linkingId]) acc[doc.linkingId] = {};
      acc[doc.linkingId][doc.version] = doc;
      return acc;
    }, {});
    console.log(`Grouped into ${Object.keys(groupedSubjects).length} unique subjects.`);

    const newEmbeddings = [];

    console.log("Step 4/5: Processing pairs and generating new embeddings...");
    for (const linkingId in groupedSubjects) {
      const pair = groupedSubjects[linkingId];
      const enSubject = pair.english;
      const bnSubject = pair.bangla;

      if (!enSubject || !bnSubject) {
        const warningMsg = `Warning: Incomplete subject pair for linkingId ${linkingId}. Skipping.`;
        console.warn(warningMsg);
        stats.warnings.push(warningMsg);
        continue;
      }
      
      console.log(` -> Processing Subject: ${enSubject.name}`);
      stats.subjectsProcessed++;

      for (let i = 0; i < enSubject.chapters.length; i++) {
        const enChapter = enSubject.chapters[i];
        const bnChapter = bnSubject.chapters[i];
        
        if (!enChapter || !bnChapter) {
           const warningMsg = `Warning: Chapter mismatch for subject ${enSubject.name} at index ${i}. Skipping chapter.`;
           console.warn(warningMsg);
           stats.warnings.push(warningMsg);
           continue;
        }

        for (let j = 0; j < enChapter.topics.length; j++) {
          const enTopic = enChapter.topics[j];
          const bnTopic = bnChapter.topics[j];

          if (!enTopic || !bnTopic || !enTopic.segments || !bnTopic.segments) {
            const topicId = enTopic?._id || bnTopic?._id || 'N/A';
            const warningMsg = `Warning: Incomplete or malformed topic data for topicId ~${topicId}. Skipping topic.`;
            console.warn(warningMsg);
            stats.warnings.push(warningMsg);
            continue;
          }
          stats.topicsProcessed += 2; 

          for (let k = 0; k < enTopic.segments.length; k++) {
            const enSegment = enTopic.segments[k];
            const bnSegment = bnTopic.segments[k];

            if(!enSegment || !bnSegment){
                continue;
            }
            
            // UPDATED: Use the new helper function for comprehensive chunk text
            const englishText = _createEmbeddingChunkText('english', enSubject, enChapter, enTopic, enSegment);
            const banglaText = _createEmbeddingChunkText('bangla', bnSubject, bnChapter, bnTopic, bnSegment);
            
            const [englishEmbed, banglaEmbed] = await Promise.all([
                embeddings.embedQuery(englishText), 
                embeddings.embedQuery(banglaText)
            ]);

            if (!englishEmbed || !banglaEmbed) {
                const warningMsg = `Warning: Embedding generation failed for segment ${enSegment.uniqueKey} in topic ${enTopic.name}. Skipping segment.`;
                console.error(warningMsg);
                stats.warnings.push(warningMsg);
                continue;
            }

            const commonData = {
              subject: { englishName: enSubject.name, banglaName: bnSubject.name },
              otherData: JSON.stringify({
                  chapter: { englishName: enChapter.name, banglaName: bnChapter.name }
              })
            };

            newEmbeddings.push({
              ...commonData,
              otherData: JSON.stringify({ ...JSON.parse(commonData.otherData), segmentUniqueKey: enSegment.uniqueKey, topicId: enTopic._id }),
              chunkText: englishText,
              embedding: englishEmbed,
            });

            newEmbeddings.push({
              ...commonData,
              otherData: JSON.stringify({ ...JSON.parse(commonData.otherData), segmentUniqueKey: bnSegment.uniqueKey, topicId: bnTopic._id }),
              chunkText: banglaText,
              embedding: banglaEmbed,
            });
          }
        }
      }
    }
    stats.embeddingsCreated = newEmbeddings.length;

    console.log(`Step 5/5: Inserting ${newEmbeddings.length} new embeddings into the database...`);
    if (newEmbeddings.length > 0) {
      await SubjectEmbedding.insertMany(newEmbeddings, { ordered: false });
    }
    console.log("--- Embedding Recreation Process Finished Successfully! ---");

    return {
      success: true,
      message: "All topic embeddings have been recreated successfully.",
      data: stats,
    };
  } catch (error) {
    console.error("--- An error occurred during embedding recreation ---");
    console.error(error);
    return {
      success: false,
      error: error.message,
      data: stats,
    };
  }
};
export const deleteAll = async () => {
  const s= await Subject.deleteMany()
 const i = await Topic.deleteMany()
 return i
}