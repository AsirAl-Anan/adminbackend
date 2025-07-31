import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
    englishName: {
        type: String,
        required: true,
    },
    banglaName: {
        type: String,
        required: true,
    },
    subjectCode: {
        type: Number,
        required: true,
    },
    level: {
        type: String,
        enum: ['SSC', 'HSC'],
        required: true,
    },
    group: {
        type: String,
        enum: ['science', 'arts', 'commerce'],
        required: true,
    },
    chapters: {
        type: [{
            englishName: {
                type: String,
                trim:true,
               
                required: true,

            },
            banglaName: {
                type: String,
                
                required: true,
            },
            topics: {
                type: [{
                    englishName: {
                        type: String,
                        required: true,
                    },
                    banglaName: {
                        type: String,
                        required: true,
                    }
                }]
            }
        }],
        required: true,
    }
});

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;