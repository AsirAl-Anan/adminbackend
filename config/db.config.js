import mongoose, { mongo } from "mongoose"


export const connectDb = async () => {
   await mongoose.connect(process.env.MONGODB_URI ).then(()=>{
        console.log("database connected")
    }).catch((err)=>{
        console.log("error while connecting to database: ", err)
    })

}

