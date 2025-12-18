
import mongoose from 'mongoose';
import { createQuestion } from '../services/question.service.js';
import Subject from '../models/subject.model.js';
import Chapter from '../models/chapter.model.js';
import { academicDb } from '../config/db.config.js';

// Mock Data representing AI Output
const mockAiData = {
    extractedMetadata: {
        board: "Dhaka Board",
        partChapters: {
            a: "Introduction to Physics",
            b: "Introduction to Physics",
            c: "Vector",
            d: "Vector"
        },
        mainChapter: "Vector", // Should match created dummy chapter
        aliases: { en: ["Test Alias"], bn: [], banglish: [] },
        tags: { en: ["Test Tag"], bn: [] }
    },
    stem: [{ text: { en: "Stem text", bn: "Stem BN" } }],
    a: { question: [{ text: { en: "Q A", bn: "Q A BN" } }], answer: [{ text: { en: "Ans A", bn: "Ans A BN" } }] },
    b: { question: [{ text: { en: "Q B", bn: "Q B BN" } }], answer: [{ text: { en: "Ans B", bn: "Ans B BN" } }] },
    c: { question: [{ text: { en: "Q C", bn: "Q C BN" } }], answer: [{ text: { en: "Ans C", bn: "Ans C BN" } }] },
    d: { question: [{ text: { en: "Q D", bn: "Q D BN" } }], answer: [{ text: { en: "Ans D", bn: "Ans D BN" } }] },
};

const run = async () => {
    try {
        console.log("Connecting to DB...");
        // Wait for connection
        if (academicDb.readyState === 0) {
            console.log("Waiting for DB connection...");
        }

        // 1. Get a Subject ID (General Science or Physics)
        const subject = await Subject.findOne({ 'name.en': { $regex: 'Physics', $options: 'i' } });
        if (!subject) {
            console.error("Subject 'Physics' not found. Please create it first (e.g. Physics 1st Paper).");
            process.exit(1);
        }
        console.log(`Using Subject: ${subject.name.en} (${subject._id})`);

        // 2. Ensure Chapter 'Vector' exists for this subject
        await Chapter.deleteMany({ subjectId: subject._id, 'name.en': 'Vector' }); // Cleanup first
        const mainChapter = await Chapter.create({
            subjectId: subject._id,
            chapterNo: 2,
            name: { en: 'Vector', bn: 'ভেক্টর' },
            topics: []
        });
        console.log(`Created Chapter: ${mainChapter.name.en} (${mainChapter._id})`);

        // 3. Ensure Chapter 'Introduction to Physics' exists
        await Chapter.deleteMany({ subjectId: subject._id, 'name.en': 'Introduction to Physics' });
        const partChapter = await Chapter.create({
            subjectId: subject._id,
            chapterNo: 1,
            name: { en: 'Introduction to Physics', bn: 'Introduction to Physics BN' },
            topics: []
        });
        console.log(`Created Chapter: ${partChapter.name.en} (${partChapter._id})`);

        // --- LOGIC REPLICATION FROM QUESTION.SERVICE.JS ---
        console.log("Running Logic Replication with FIXES...");

        // Fetch chapters for lookup
        const allChapters = await Chapter.find({ subjectId: subject._id }).select('name aliases _id').lean();

        const findChapterId = (nameQuery) => {
            if (!nameQuery) return null;
            const normalizedQuery = nameQuery.toLowerCase().trim();
            const match = allChapters.find(ch => {
                if (ch.name?.en?.toLowerCase() === normalizedQuery) return true;
                if (ch.name?.bn === nameQuery) return true;
                return false;
            });
            return match ? match._id : null;
        };

        const meta = mockAiData.extractedMetadata;
        const mainChapterId = findChapterId(meta.mainChapter);

        console.log(`Lookup Main Chapter '${meta.mainChapter}': Found ${mainChapterId}`);
        console.log(`Lookup Part A Chapter '${meta.partChapters.a}': Found ${findChapterId(meta.partChapters.a)}`);

        if (!mainChapterId) throw new Error("Main chapter lookup failed (should have found Vector).");

        // Prepare Data
        const year = "2024";
        const questionData = {
            stem: mockAiData.stem,
            a: { ...mockAiData.a, marks: 1, chapter: findChapterId(meta.partChapters?.a) },
            b: { ...mockAiData.b, marks: 2, chapter: findChapterId(meta.partChapters?.b) },
            c: { ...mockAiData.c, marks: 3, chapter: findChapterId(meta.partChapters?.c) },
            d: { ...mockAiData.d, marks: 4, chapter: findChapterId(meta.partChapters?.d) },
            source: {
                source: {
                    sourceType: 'BOARD',
                    value: meta.board || 'Unknown Board',
                },
                year: parseInt(year),
                examType: '',
            },
            meta: {
                level: subject.level,
                group: subject.group,
                subject: { _id: subject._id, name: subject.name.en },
                mainChapter: {
                    _id: mainChapterId,
                    name: meta.mainChapter
                },
                aliases: meta.aliases,
                tags: meta.tags,
            },
            status: 'DRAFT',
        };

        // Create Question
        const saveResult = await createQuestion(questionData);
        console.log("Create Result:", JSON.stringify(saveResult, null, 2));

        if (saveResult.success) {
            console.log("SUCCESS: Question created.");
        } else {
            console.error("FAILURE: Question creation failed.");
        }

    } catch (error) {
        console.error("Test Error:", error);
    } finally {
        process.exit();
    }
};

run();
