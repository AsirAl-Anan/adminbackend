import mongoose, { mongo } from "mongoose"


export const connectDb = () => {
    mongoose.connect(process.env.MONGO_URL).then(()=>{
        console.log("database connected")
    })

}