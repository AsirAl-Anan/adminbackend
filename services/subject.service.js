import Subject from '../models/subject.model.js';
// Get all subjects
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
    const subject = await Subject.findById(id);
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
    const subject = await Subject.findById(id, 'chapters');
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
    const subject = await Subject.findById(id, 'englishName banglaName chapters');
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
// Add chapter to subject
export const addChapterToSubject = async (id, chapterData) => {
  try {
    const { englishName, banglaName, topics = [] } = chapterData;
    
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { $push: { chapters: { englishName, banglaName, topics } } },
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
// Add topic to specific chapter
// Add topic to specific chapter
export const addTopicToChapter = async (id, chapterIndex, topicData) => {
  try {
    const subject = await Subject.findById(id);
    
    if (!subject) {
      return { success: false, message: 'Subject not found' };
    }
    
    if (!subject.chapters[chapterIndex]) {
      return { success: false, message: 'Chapter not found' };
    }
    
    const { englishName, banglaName } = topicData;
    
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { $push: { [`chapters.${chapterIndex}.topics`]: { englishName, banglaName } } },
      { new: true, runValidators: true }
    );
    
    return { success: true,  updatedSubject };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
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
    
    // Remove the topic using $unset and $pull operators
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { $unset: { [`chapters.${chapterIndex}.topics.${topicIndex}`]: 1 } },
      { new: true, runValidators: true }
    );
    
    // Clean up the null value created by $unset
    const cleanedSubject = await Subject.findByIdAndUpdate(
      id,
      { $pull: { [`chapters.${chapterIndex}.topics`]: null } },
      { new: true, runValidators: true }
    );
    
    return { success: true,  cleanedSubject };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Alternative implementation using array filtering
export const removeTopicFromChapterByNames = async (id, chapterIndex, topicEnglishName) => {
  try {
    const subject = await Subject.findById(id);
    
    if (!subject) {
      return { success: false, message: 'Subject not found' };
    }
    
    if (!subject.chapters[chapterIndex]) {
      return { success: false, message: 'Chapter not found' };
    }
    
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { $pull: { [`chapters.${chapterIndex}.topics`]: { englishName: topicEnglishName } } },
      { new: true, runValidators: true }
    );
    
    if (!updatedSubject) {
      return { success: false, message: 'Subject not found or topic not removed' };
    }
    
    return { success: true,  updatedSubject };
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
    
    const subjects = await Subject.find(filter);
    
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