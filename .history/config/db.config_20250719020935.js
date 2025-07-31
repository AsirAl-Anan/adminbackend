import mongoose, { mongo } from "mongoose"


export const connectDb = () => {
    mongoose.connect(process.env.MONGDB_URI ).then(()=>{
        console.log("database connected")
    }).catch((err)=>{
        console.log("error while connecting to database: ", err)
    })

}