import { v2 as cloudinary } from 'cloudinary';
import { createHash } from 'crypto';

/**
 * Initialize Cloudinary with environment variables
 */
function initializeCloudinary() {
  const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  
  // Validate required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true, // Use HTTPS URLs
    sign_url: true, // Enable URL signing for security
  });

  console.log('✅ Cloudinary configured successfully');
}

/**
 * Setup global error handling for Cloudinary operations
 */
function setupErrorHandling() {
  process.on('unhandledRejection', (reason, promise) => {
    if (reason?.message?.includes('cloudinary')) {
      console.error('🚨 Cloudinary unhandled rejection:', reason);
    }
  });
}

/**
 * Upload image with optimizations and transformations
 */


async function uploadImage(file, options = {}) {
  try {
    const {
      folder = '',
      quality = 'auto:best',
      format, 
      tags = [],
      transformation = [],
      publicId,
      overwrite = false,
      resourceType = 'image',
    } = options;

    // Handle file input: string path, multer file, buffer, etc.
    let fileInput;
    if (typeof file === 'string') {
      fileInput = file; // Local file path
    } else if (file?.buffer) {
      fileInput = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    } else if (file?.path) {
      fileInput = file.path; // Multer disk storage
    } else if (Buffer.isBuffer(file)) {
      fileInput = file;
    } else {
      throw new Error('Invalid file input. Expected file path, buffer, or multer file object.');
    }

    const uploadOptions = {
      folder,
      tags: Array.isArray(tags) ? tags : [tags],
      transformation: [
        { quality },
        ...transformation,
      ],
      overwrite,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: !publicId,
      ...(publicId && { public_id: publicId }),
      ...(format && { format }), // Only include if valid format is provided
    };

    const result = await cloudinary.uploader.upload(fileInput, uploadOptions);

    return {
      success: true,
      data: {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        createdAt: result.created_at,
      },
    };

  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}




/**
 * Upload video with compression and optimization
 */
async function uploadVideo(file, options = {}) {
  try {
    const {
      folder = 'videos',
      quality = 'auto',
      videoCodec = 'auto',
      tags = [],
      publicId,
      overwrite = false,
    } = options;

    // Handle different file input types
    let fileInput;
    if (typeof file === 'string') {
      // File path
      fileInput = file;
    } else if (file?.buffer) {
      // Buffer from multer memory storage
      fileInput = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    } else if (file?.path) {
      // File path from multer disk storage
      fileInput = file.path;
    } else if (Buffer.isBuffer(file)) {
      // Raw buffer
      fileInput = file;
    } else {
      throw new Error('Invalid file input. Expected file path, buffer, or multer file object.');
    }

    const uploadOptions = {
      folder,
      quality,
      video_codec: videoCodec,
      tags: Array.isArray(tags) ? tags : [tags],
      resource_type: 'video',
      overwrite,
      use_filename: true,
      unique_filename: !publicId,
      ...(publicId && { public_id: publicId }),
    };

    const result = await cloudinary.uploader.upload(fileInput, uploadOptions);
    
    return {
      success: true,
      data: {
        publicId: result.public_id,
        url: result.secure_url,
        duration: result.duration,
        format: result.format,
        size: result.bytes,
        createdAt: result.created_at,
      },
    };
  } catch (error) {
    console.error('❌ Cloudinary video upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate optimized image URL with transformations
 */
function generateImageUrl(publicId, transformations = {}) {
  try {
    const {
      width,
      height,
      crop = 'fill',
      quality = 'auto:best',
      format = 'auto',
      gravity = 'auto',
      effect,
      background,
    } = transformations;

    const transformationArray = [
      { quality, fetch_format: format },
      ...(width && height ? [{ width, height, crop, gravity }] : []),
      ...(effect ? [{ effect }] : []),
      ...(background ? [{ background }] : []),
    ].filter(Boolean);

    return cloudinary.url(publicId, {
      transformation: transformationArray,
      secure: true,
    });
  } catch (error) {
    console.error('❌ Error generating image URL:', error);
    return null;
  }
}

/**
 * Delete resource from Cloudinary
 */
async function deleteResource(publicId, resourceType = 'image') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return {
      success: result.result === 'ok',
      data: result,
    };
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get resource details and metadata
 */
async function getResourceDetails(publicId, resourceType = 'image') {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('❌ Error fetching resource details:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * List resources in a folder with pagination
 */
async function listResources(options = {}) {
  try {
    const {
      folder,
      resourceType = 'image',
      maxResults = 50,
      nextCursor,
      sortBy = 'created_at',
      direction = 'desc',
    } = options;

    const searchOptions = {
      resource_type: resourceType,
      max_results: maxResults,
      sort_by: [[sortBy, direction]],
      ...(nextCursor && { next_cursor: nextCursor }),
      ...(folder && { prefix: folder }),
    };

    const result = await cloudinary.search
      .expression(folder ? `folder:${folder}` : '*')
      .with_field('context')
      .with_field('tags')
      .sort_by(sortBy, direction)
      .max_results(maxResults)
      .execute();

    return {
      success: true,
      data: {
        resources: result.resources,
        nextCursor: result.next_cursor,
        totalCount: result.total_count,
      },
    };
  } catch (error) {
    console.error('❌ Error listing resources:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate signed upload URL for client-side uploads
 */
function generateSignedUploadUrl(options = {}) {
  try {
    const {
      folder = 'uploads',
      tags = [],
      transformation = [],
      eager = [],
    } = options;

    const timestamp = Math.round(new Date().getTime() / 1000);
    
    const params = {
      timestamp,
      folder,
      tags: Array.isArray(tags) ? tags.join(',') : tags,
      ...(transformation.length && { transformation }),
      ...(eager.length && { eager }),
    };

    // Remove undefined values
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === '') {
        delete params[key];
      }
    });

    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

    return {
      success: true,
      data: {
        url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
        params: {
          ...params,
          signature,
          api_key: process.env.CLOUDINARY_API_KEY,
        },
      },
    };
  } catch (error) {
    console.error('❌ Error generating signed upload URL:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Batch delete resources
 */
async function batchDelete(publicIds, resourceType = 'image') {
  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('❌ Batch delete error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Health check for Cloudinary connection
 */
async function healthCheck() {
  try {
    await cloudinary.api.ping();
    return { success: true, message: 'Cloudinary connection healthy' };
  } catch (error) {
    console.error('❌ Cloudinary health check failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize Cloudinary configuration on module load
 */
function initialize() {
  initializeCloudinary();
  setupErrorHandling();
}

// Initialize when module is imported
initialize();

// Export all functions
export {
  uploadImage,
  uploadVideo,
  generateImageUrl,
  deleteResource,
  getResourceDetails,
  listResources,
  generateSignedUploadUrl,
  batchDelete,
  healthCheck,
  initialize,
};