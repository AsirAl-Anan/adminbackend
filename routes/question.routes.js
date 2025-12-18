import express from 'express';
import multer from 'multer';
import {
    addQuestion,
    getQuestion,
    editQuestion,
    deleteQuestion,
    getQuestionsBySubject,
    bulkIngestQuestions
} from '../controllers/question.controller.js';

const router = express.Router();

// Multer Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        // Preserve extension
        const ext = file.originalname.split('.').pop();
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + ext)
    }
});

const upload = multer({ storage: storage });

// Middleware to parse stringified JSON fields from FormData
// This is still very useful for handling complex nested objects sent via FormData
function parseBodyMiddleware(req, res, next) {
    const fieldsToParse = [
        'meta', 'source', 'aliases', 'tags',
        'a', 'b', 'c', 'd', 'stem'
    ];

    for (const field of fieldsToParse) {
        if (req.body[field] && typeof req.body[field] === 'string') {
            try {
                req.body[field] = JSON.parse(req.body[field]);
            } catch (error) {
                console.error(`Error parsing JSON for field: ${field}`, error);
                return res.status(400).json({ success: false, message: `Invalid JSON format for field: ${field}` });
            }
        }
    }
    next();
}



router.post('/', parseBodyMiddleware, addQuestion);

// Bulk Ingestion Route
router.post('/bulk', upload.array('images'), bulkIngestQuestions);


router.get('/:id', getQuestion);


router.get('/subject/:subjectId', getQuestionsBySubject);

// PUT /api/questions/:id - Update a question by ID
router.put('/:id', parseBodyMiddleware, editQuestion);

// DELETE /api/questions/:id - Delete a question by ID
router.delete('/:id', deleteQuestion);



export default router;