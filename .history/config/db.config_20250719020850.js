import mongoose, { mongo } from "mongoose"
import dotenv from 'dotenv';
dotenv.config();

export const connectDb = () => {
    mongoose.connect(process.env.MONGODB_URI ).then(()=>{
        console.log("database connected")
    }).catch((err)=>{
        console.log("error while connecting to database: ", err)
    })

}