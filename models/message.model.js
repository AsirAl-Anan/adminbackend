import mongoose from "mongoose";
import { userDb } from "../config/db.config.js";


const messageSchema = mongoose.Schema({
    message:{
        type:String,
    
    },
    sender:{
        type: String,  //user email
        required:true,
    
    },
    image: {
      
        type: String,
       
      },
}, {timestamps:true});


const Message = userDb.model("Message", messageSchema);
export default Message;
