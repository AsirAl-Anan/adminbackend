import express from 'express';
import { uploadFile } from '../controllers/upload.controller.js';
import { upload } from '../utils/multer.js';

const router = express.Router();

// Route to upload a single file
// Uses 'image' as the field name, consistent with the frontend expectation
router.post('/', upload.single('image'), uploadFile);

export default router;
