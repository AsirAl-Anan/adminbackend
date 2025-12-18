import fetch from 'node-fetch';

const PORT = 3000;
const URL = `http://localhost:${PORT}/api/v1/subject/subjects/full`;

const payload = {
    name: {
        en: "Test Subject Bulk",
        bn: "টেস্ট সাবজেক্ট"
    },
    subjectCode: 999,
    level: "HSC",
    group: "SCIENCE",
    chapters: [
        {
            chapterNo: 1,
            name: {
                en: "Test Chapter 1",
                bn: "টেস্ট চ্যাপ্টার ১"
            },
            topics: [
                {
                    name: {
                        en: "Test Topic 1.1",
                        bn: "টেস্ট টপিক ১.১"
                    },
                    topicNumber: "1.1"
                },
                {
                    name: {
                        en: "Test Topic 1.2",
                        bn: "টেস্ট টপিক ১.২"
                    },
                    topicNumber: "1.2"
                }
            ]
        },
        {
            chapterNo: 2,
            name: {
                en: "Test Chapter 2",
                bn: "টেস্ট চ্যাপ্টার ২"
            },
            topics: []
        }
    ]
};

async function testBulkCreate() {
    try {
        console.log(`Sending request to ${URL}...`);
        const response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Request failed with status ${response.status}: ${text}`);
        }

        const data = await response.json();
        console.log("Success! Created Subject:");
        console.log(JSON.stringify(data, null, 2));

        // Verify structure
        if (data.chapters.length === 2 && data.chapters[0].topics.length === 2) {
            console.log("Verification Passed: Structure matches.");
        } else {
            console.error("Verification Failed: Structure mismatch.");
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

testBulkCreate();
