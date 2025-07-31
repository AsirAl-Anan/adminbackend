import mongoose from "mongoose";


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


const Message = mongoose.model("Message", messageSchema);
export default Message;