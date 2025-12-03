import { v4 as uuidv4 } from "uuid";
import Subject from "../models/subject.model.js";
import Chapter from "../models/chapter.model.js";
import Topic from "../models/topic.model.js";
import Formula from "../models/formula.model.js";
import { AppError } from "../utils/errors.js";
import mongoose from "mongoose";
// ----------------- Subject Service -----------------

export const createSubject = async (subjectData) => {
  const subject = new Subject(subjectData);
  await subject.save();
  return subject;
};

export const getAllSubjects = async () => {
  return await Subject.find().populate({
    path: "chapters",
    populate: {
      path: "topics",
      model: "Topic",
      populate: [
        {
          path: "articles.formulas", // Populate formulas within each topic
          model: "Formula",
        },
        {
          path: "articles.sections.formulas", // Populate formulas within each section
          model: "Formula",
        },
      ],
    },
  });
};

export const getSubjectById = async (id) => {
  const subject = await Subject.findById(id).populate({
    path: "chapters",
    populate: {
      path: "topics",
      model: "Topic",
      populate: [
        {
          path: "articles.formulas", // Populate formulas within each topic
          model: "Formula",
        },
        {
          path: "articles.sections.formulas", // Populate formulas within each section
          model: "Formula",
        },
      ],
    },
  });
  if (!subject) {
    throw new AppError("Subject not found", 404);
  }
  return subject;
};

export const updateSubject = async (id, subjectData) => {
  const subject = await Subject.findByIdAndUpdate(id, subjectData, {
    new: true,
    runValidators: true,
  });
  if (!subject) {
    throw new AppError("Subject not found", 404);
  }
  return subject;
};

export const deleteSubject = async (id) => {
  const subject = await Subject.findById(id);
  if (!subject) {
    throw new AppError("Subject not found", 404);
  }

  // Delete all topics within the chapters of the subject
  for (const chapterId of subject.chapters) {
    const chapter = await Chapter.findById(chapterId);
    if (chapter) {
      await Topic.deleteMany({ _id: { $in: chapter.topics } });
    }
  }

  // Delete all chapters of the subject
  await Chapter.deleteMany({ _id: { $in: subject.chapters } });

  // Delete the subject itself
  await Subject.findByIdAndDelete(id);

  return { message: "Subject and its chapters and topics deleted successfully" };
};

// ----------------- Chapter Service -----------------

export const createChapter = async (subjectId, chapterData) => {
  const chapter = new Chapter({ ...chapterData, subjectId });
  await chapter.save();

  await Subject.findByIdAndUpdate(subjectId, {
    $push: { chapters: chapter._id },
  });

  return chapter;
};

export const updateChapter = async (id, chapterData) => {
  const chapter = await Chapter.findByIdAndUpdate(id, chapterData, {
    new: true,
    runValidators: true,
  });
  if (!chapter) {
    throw new AppError("Chapter not found", 404);
  }
  return chapter;
};
export const getSubjectsByLevelAndGroup = async (level, group) => {
    if (!level || !group) {
        throw new AppError("Level and group are required.", 400);
    }
    return await Subject.find({ level, group }).select('_id name');
};
export const getChaptersBySubject = async (subjectId) => {
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        throw new AppError("Invalid Subject ID.", 400);
    }
    const subject = await Subject.findById(subjectId).populate('chapters', '_id name chapterNo');
    if (!subject) {
        throw new AppError("Subject not found.", 404);
    }
    return subject.chapters;
};
export const getTopicsByChapter = async (chapterId) => {
    if (!mongoose.Types.ObjectId.isValid(chapterId)) {
        throw new AppError("Invalid Chapter ID.", 400);
    }
    const chapter = await Chapter.findById(chapterId).populate('topics', '_id name topicNumber');
    if (!chapter) {
        throw new AppError("Chapter not found.", 404);
    }
    return chapter.topics;
};

// NEW: Get question types for a specific topic
export const getQuestionTypesByTopic = async (topicId) => {
    if (!mongoose.Types.ObjectId.isValid(topicId)) {
        throw new AppError("Invalid Topic ID.", 400);
    }
    const topic = await Topic.findById(topicId).select('questionTypes');
    if (!topic) {
        throw new AppError("Topic not found.", 404);
    }
    return topic.questionTypes;
};

export const deleteChapter = async (id) => {
  const chapter = await Chapter.findById(id);
  if (!chapter) {
    throw new AppError("Chapter not found", 404);
  }

  // Remove chapter from subject's chapters array
  await Subject.findByIdAndUpdate(chapter.subjectId, {
    $pull: { chapters: chapter._id },
  });

  // Delete all topics in the chapter
  await Topic.deleteMany({ _id: { $in: chapter.topics } });

  // Delete the chapter itself
  await Chapter.findByIdAndDelete(id);

  return { message: "Chapter and its topics deleted successfully" };
};

// ----------------- Topic Service -----------------

export const createTopic = async (chapterId, topicData) => {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) {
    throw new AppError("Chapter not found", 404);
  }

  // 1. Create the topic instance. Mongoose will auto-generate ObjectIds for articles and sections.
  const topic = new Topic({
    ...topicData,
    articles: topicData.articles.map((article) => ({
      ...article,
      formulas: [], // Initialize as empty
      sections: article.sections.map((section) => ({
        ...section,
        formulas: [], // Initialize as empty
      })),
    })),
    chapterId,
    subjectId: chapter.subjectId,
  });

  // 2. Now, iterate through the topic data to create formulas, using the generated IDs
  for (let i = 0; i < topicData.articles.length; i++) {
    const articleData = topicData.articles[i];
    const createdArticle = topic.articles[i]; // This now has a valid ._id

    // Process article-level formulas
    if (articleData.formulas) {
      for (const formulaData of articleData.formulas) {
        const newFormula = new Formula({
          ...formulaData,
          topicId: topic._id,
          sectionId: createdArticle._id.toString(), // Use the generated ObjectId
          chapterId: chapter._id,
          subjectId: chapter.subjectId,
          level: topicData.level,
          group: topicData.group,
        });
        await newFormula.save();
        createdArticle.formulas.push(newFormula._id);
      }
    }

    // Process section-level formulas
    if (articleData.sections) {
      for (let j = 0; j < articleData.sections.length; j++) {
        const sectionData = articleData.sections[j];
        const createdSection = createdArticle.sections[j]; // This also has a valid ._id

        if (sectionData.formulas) {
          for (const formulaData of sectionData.formulas) {
            const newFormula = new Formula({
              ...formulaData,
              topicId: topic._id,
              sectionId: createdSection._id.toString(), // Use the generated ObjectId
              chapterId: chapter._id,
              subjectId: chapter.subjectId,
              level: topicData.level,
              group: topicData.group,
            });
            await newFormula.save();
            createdSection.formulas.push(newFormula._id);
          }
        }
      }
    }
  }

  // 3. Save the topic again with the formula references
  await topic.save();

  // 4. Update the chapter with the new topic's ID
  await Chapter.findByIdAndUpdate(chapterId, {
    $push: { topics: topic._id },
  });

  return topic;
};

export const bulkCreateTopics = async (chapterId, subjectId, topicsData) => {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) {
    throw new AppError("Chapter not found", 404);
  }

  const createdTopics = [];
  const topicIds = [];

  for (const topicData of topicsData) {
    const topic = new Topic({
      name: topicData.name,
      chapterId,
      subjectId,
      // Initialize other required fields with defaults or empty values if needed
      articles: [], 
      tags: [],
      aliases: { english: [], bangla: [], banglish: [] }
    });
    
    await topic.save();
    createdTopics.push(topic);
    topicIds.push(topic._id);
  }

  // Update the chapter with the new topic IDs
  await Chapter.findByIdAndUpdate(chapterId, {
    $push: { topics: { $each: topicIds } },
  });

  return createdTopics;
};

export const updateTopic = async (id, topicData) => {
  const existingTopic = await Topic.findById(id);
  if (!existingTopic) {
    throw new AppError("Topic not found", 404);
  }

  const processedArticles = [];
  const formulasToKeep = new Set();

  for (const article of topicData.articles || []) {
    // If an ID exists, use it. If not, create a new MongoDB ObjectId.
    const articleId = article._id ? article._id : new mongoose.Types.ObjectId();
    const processedArticle = { ...article, _id: articleId, formulas: [] };

    // Process article-level formulas
    for (const formulaData of article.formulas || []) {
      let formulaId;
      if (formulaData._id) {
        // Update existing formula, ensuring correct sectionId
        await Formula.findByIdAndUpdate(formulaData._id, { ...formulaData, sectionId: articleId.toString() }, { new: true, runValidators: true });
        formulaId = formulaData._id;
      } else {
        // Create new formula
        const newFormula = new Formula({
          ...formulaData,
          topicId: id,
          chapterId: existingTopic.chapterId,
          subjectId: existingTopic.subjectId,
          level: topicData.level || existingTopic.level,
          group: topicData.group || existingTopic.group,
          sectionId: articleId.toString(), // Assign article's ID
        });
        await newFormula.save();
        formulaId = newFormula._id;
      }
      processedArticle.formulas.push(formulaId);
      formulasToKeep.add(formulaId.toString());
    }

    // Process section-level formulas
    processedArticle.sections = [];
    for (const section of article.sections || []) {
      // If an ID exists, use it. If not, create a new MongoDB ObjectId.
      const sectionId = section._id ? section._id : new mongoose.Types.ObjectId();
      const processedSection = { ...section, _id: sectionId, formulas: [] };

      for (const formulaData of section.formulas || []) {
        let formulaId;
        if (formulaData._id) {
          // Update existing formula, ensuring correct sectionId
          await Formula.findByIdAndUpdate(formulaData._id, { ...formulaData, sectionId: sectionId.toString() }, { new: true, runValidators: true });
          formulaId = formulaData._id;
        } else {
          // Create new formula
          const newFormula = new Formula({
            ...formulaData,
            topicId: id,
            chapterId: existingTopic.chapterId,
            subjectId: existingTopic.subjectId,
            level: topicData.level || existingTopic.level,
            group: topicData.group || existingTopic.group,
            sectionId: sectionId.toString(), // Assign section's ID
          });
          await newFormula.save();
          formulaId = newFormula._id;
        }
        processedSection.formulas.push(formulaId);
        formulasToKeep.add(formulaId.toString());
      }
      processedArticle.sections.push(processedSection);
    }
    processedArticles.push(processedArticle);
  }

  // Delete formulas that are no longer referenced in the updated topic
  const allExistingFormulaIds = [];
  existingTopic.articles.forEach(article => {
    if (article.formulas) {
        article.formulas.forEach(fid => allExistingFormulaIds.push(fid.toString()));
    }
    if (article.sections) {
        article.sections.forEach(section => {
            if (section.formulas) {
                section.formulas.forEach(fid => allExistingFormulaIds.push(fid.toString()));
            }
        });
    }
  });


  const formulasToDelete = allExistingFormulaIds.filter(
    (formulaId) => !formulasToKeep.has(formulaId)
  );

  if (formulasToDelete.length > 0) {
    await Formula.deleteMany({ _id: { $in: formulasToDelete } });
  }

  // Update the topic with processed articles and other data
  const updatedTopic = await Topic.findByIdAndUpdate(
    id,
    {
      ...topicData,
      articles: processedArticles,
    },
    { new: true, runValidators: true }
  );

  if (!updatedTopic) {
    throw new AppError("Topic not found", 404);
  }
  return updatedTopic;
};


export const deleteTopic = async (id) => {
  const foundTopic = await Topic.findById(id);
  if (!foundTopic) {
    throw new AppError("Topic not found", 404);
  }

  // Remove topic from chapter's topics array
  await Chapter.findByIdAndUpdate(foundTopic.chapterId, {
    $pull: { topics: foundTopic._id },
  });

  // Delete the topic itself
  await Topic.findByIdAndDelete(id);

  return { message: "Topic deleted successfully" };
};

// ----------------- Formula Service -----------------

export const createFormula = async (topicId, formulaData) => {
  const foundTopic = await Topic.findById(topicId);
  if (!foundTopic) {
    throw new AppError("Topic not found", 404);
  }

  const formula = new Formula({
    ...formulaData,
    topicId,
    chapterId: foundTopic.chapterId,
    subjectId: foundTopic.subjectId,
  });
  await formula.save();

  // Add formula reference to the topic's articles.formulas array
  // Note: This standalone function might need adjustment to specify which article/section to add to.
  await Topic.findByIdAndUpdate(topicId, {
    $push: { "articles.0.formulas": formula._id }, // Example: Pushing to the first article
  });

  return formula;
};

export const getFormulaById = async (id) => {
  const formula = await Formula.findById(id);
  if (!formula) {
    throw new AppError("Formula not found", 404);
  }
  return formula;
};

export const updateFormula = async (id, formulaData) => {
  const formula = await Formula.findByIdAndUpdate(id, formulaData, {
    new: true,
    runValidators: true,
  });
  if (!formula) {
    throw new AppError("Formula not found", 404);
  }
  return formula;
};

export const deleteFormula = async (id) => {
  const formula = await Formula.findById(id);
  if (!formula) {
    throw new AppError("Formula not found", 404);
  }

  // Remove formula reference from any topics that might contain it
  await Topic.updateMany(
    { "articles.formulas": id },
    { $pull: { "articles.$[].formulas": id } }
  );
  await Topic.updateMany(
    { "articles.sections.formulas": id },
    { $pull: { "articles.$[].sections.$[].formulas": id } }
  );

  await Formula.findByIdAndDelete(id);

  return { message: "Formula deleted successfully" };
};
