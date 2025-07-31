import {Router} from "express"
import { sendMessageController, getMessagesController } from "../controllers/message.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
import { configurations, handleMulterError } from '../utils/multer.js';
import { uploadImage } from "../utils/cloudinary.js";
import fs from 'fs/promises'
const router = Router();

router.post("/send-message",  verifyUser,configurations.single,handleMulterError,sendMessageController);
router.get("/get-messages", verifyUser,configurations.none ,handleMulterError,getMessagesController);



export default router;