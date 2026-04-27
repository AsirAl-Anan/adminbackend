import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.createConnection(process.env.MONGODB_URI_ACADEMIC)
  .asPromise()
  .then(async (academicDb) => {
    const Subject = (await import("./models/subject.model.js")).default;
    const subject = await Subject.findById("69a291800b505dfba7190bfb");
    if (!subject) {
       console.log("Subject not found");
    } else {
       console.log("Subject name:", subject.name.en);
       console.log("taxonomyConfig:", JSON.stringify(subject.taxonomyConfig, null, 2));
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
