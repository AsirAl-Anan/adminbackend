import * as subjectService from '../services/subject.service.js'; // Adjust path as needed
import { createEmbeddingsForSubjectsChaptersAndTopics } from '../services/aiRag.service.js';
// Get all subjects
export const getSubjects = async (req, res) => {
  try {
    const result = await subjectService.getAllSubjects();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error fetching subjects',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subjects',
      error: error.message
    });
  }
};

// Get single subject by ID
export const getSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await subjectService.getSubjectById(id);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      const statusCode = result.message === 'Subject not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: result.message || 'Error fetching subject',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subject',
      error: error.message
    });
  }
};

// Get subject topics by subject ID
export const getSubjectTopics = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await subjectService.getSubjectTopicsById(id);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      const statusCode = result.message === 'Subject not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: result.message || 'Error fetching subject topics',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subject topics',
      error: error.message
    });
  }
};

// Get chapters with topics for a specific subject
export const getSubjectChapters = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await subjectService.getSubjectChaptersById(id);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      const statusCode = result.message === 'Subject not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: result.message || 'Error fetching subject chapters',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subject chapters',
      error: error.message
    });
  }
};

// Add new subject
export const addSubject = async (req, res) => {
  try {
    const subjectData = req.body;
    console.log(subjectData)
    const result = await subjectService.createSubject(subjectData);
    
    

    if (result.success === true ) {
          const embedding = await createEmbeddingsForSubjectsChaptersAndTopics(result.data);

      res.status(201).json({
        success: true,
        message: 'Subject created successfully',
        data: result.data,
        embedding
      });
    } else {
      const statusCode = result.error && result.error.includes('validation') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: statusCode === 400 ? 'Validation error' : 'Error creating subject',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating subject',
      error: error.message
    });
  }
};

// Edit subject
export const editSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const result = await subjectService.updateSubject(id, updateData);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Subject updated successfully',
        data: result.data
      });
    } else {
      let statusCode = 500;
      let message = 'Error updating subject';
      
      if (result.message === 'Subject not found') {
        statusCode = 404;
        message = 'Subject not found';
      } else if (result.error && result.error.includes('validation')) {
        statusCode = 400;
        message = 'Validation error';
      }
      
      res.status(statusCode).json({
        success: false,
        message,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating subject',
      error: error.message
    });
  }
};

// Delete subject
export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await subjectService.deleteSubject(id);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Subject deleted successfully',
        data: result.data
      });
    } else {
      const statusCode = result.message === 'Subject not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: result.message || 'Error deleting subject',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting subject',
      error: error.message
    });
  }
};

// Add chapter to subject
export const addChapter = async (req, res) => {
  try {
    const { id } = req.params;
    const chapterData = req.body;
    const result = await subjectService.addChapterToSubject(id, chapterData);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Chapter added successfully',
        data: result.data
      });
    } else {
      const statusCode = result.message === 'Subject not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: result.message || 'Error adding chapter',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding chapter',
      error: error.message
    });
  }
};

// Add topic to specific chapter
export const addTopicToChapter = async (req, res) => {
  try {
    console.log(req.body)
    const { id, chapterIndex } = req.params;
    const { topic } = req.body;
    const result = await subjectService.addTopicToChapter(id, chapterIndex, topic);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Topic added successfully',
        data: result.data
      });
    } else {
      const statusCode = result.message === 'Subject not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: result.message || 'Error adding topic',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding topic',
      error: error.message
    });
  }
};
// Remove topic from specific chapter (by index)
export const removeTopicFromChapter = async (req, res) => {
  try {
    const { id, chapterIndex, topicIndex } = req.params;
    const result = await subjectService.removeTopicFromChapter(id, chapterIndex, topicIndex);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Topic removed successfully',
        data: result.data
      });
    } else {
      let statusCode = 500;
      if (result.message === 'Subject not found' || 
          result.message === 'Chapter not found' || 
          result.message === 'Topic not found') {
        statusCode = 404;
      }
      
      res.status(statusCode).json({
        success: false,
        message: result.message || 'Error removing topic',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing topic',
      error: error.message
    });
  }
};

// Remove topic from specific chapter (by name)
export const removeTopicFromChapterByName = async (req, res) => {
  try {
    const { id, chapterIndex } = req.params;
    const { topicEnglishName } = req.body;
    
    if (!topicEnglishName) {
      return res.status(400).json({
        success: false,
        message: 'Topic englishName is required in request body'
      });
    }
    
    const result = await subjectService.removeTopicFromChapterByNames(id, chapterIndex, topicEnglishName);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Topic removed successfully',
        data: result.data
      });
    } else {
      const statusCode = result.message === 'Subject not found' || 
                        result.message === 'Chapter not found' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: result.message || 'Error removing topic',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing topic',
      error: error.message
    });
  }
};
// Get subjects by group and level
export const getSubjectsByGroupAndLevel = async (req, res) => {
  try {
    const { group, level } = req.query;
    
    // Validate query parameters
    const validGroups = ['science', 'arts', 'commerce'];
    const validLevels = ['SSC', 'HSC'];
    
    if (group && !validGroups.includes(group)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group. Must be one of: science, arts, commerce'
      });
    }
    
    if (level && !validLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid level. Must be one of: SSC, HSC'
      });
    }
    
    const result = await subjectService.getSubjectsByGroupAndLevel(group, level);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        count: result.count,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error fetching subjects',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subjects',
      error: error.message
    });
  }
};

// Get subjects by level only
export const getSubjectsByLevel = async (req, res) => {
  try {
    const { level } = req.params;
    
    // Validate level parameter
    const validLevels = ['SSC', 'HSC'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid level. Must be one of: SSC, HSC'
      });
    }
    
    const result = await subjectService.getSubjectsByLevel(level);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        count: result.count,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error fetching subjects',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subjects',
      error: error.message
    });
  }
};

// Get subjects by group only
export const getSubjectsByGroup = async (req, res) => {
  try {
    const { group } = req.params;
    
    // Validate group parameter
    const validGroups = ['science', 'arts', 'commerce'];
    if (!validGroups.includes(group)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group. Must be one of: science, arts, commerce'
      });
    }
    
    const result = await subjectService.getSubjectsByGroup(group);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        count: result.count,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error fetching subjects',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subjects',
      error: error.message
    });
  }
};
export const removeChapterFromSubject = async (req, res) => { 
  try {
    const { id, chapterId } = req.params;
    const result = await subjectService.removeChapterFromSubject(id, chapterId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Chapter removed successfully',
        data: result.data
      });
    } else {
      const statusCode = result.message === 'Subject not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: result.message || 'Error removing chapter',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing chapter',
      error: error.message
    });
  }
}

export const editTopic = async(req,res) =>{
  
  console.log(req.files)
  const {id,chapterIndex,topicIndex} = req.params
  const subjectId = id

  const result = await subjectService.editTopic(subjectId, chapterIndex, topicIndex,req.body, req.files)

  if(result.success === true){
    res.status(200).json({
    success: true,
    message: 'Topic edited successfully',
    data: result.data
  });
  }
  if(result.success === false){
    res.status(400).json({
      success: false,
      message: result.message
    });
  }
  

}