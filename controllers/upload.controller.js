import { uploadImage } from '../utils/cloudinary.js';

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    console.log(req.file)
    const result = await uploadImage(req.file);
 console.log(result)
    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          url: result.data.url,
          publicId: result.data.publicId,
        },
      });
    } else {
      return res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('Upload controller error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
